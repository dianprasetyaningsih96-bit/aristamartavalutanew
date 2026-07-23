import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Trash2, ShieldAlert, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, hasAnyRole } from "@/hooks/use-current-user";
import { MasterPageHeader } from "@/components/master-data/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/dttot")({
  head: () => ({
    meta: [
      { title: "DTTOT — Daftar Terduga Teroris" },
      {
        name: "description",
        content:
          "Kelola Daftar Terduga Teroris dan Organisasi Teroris (DTTOT) untuk screening nasabah.",
      },
    ],
  }),
  component: DttotPage,
});

type EntityType = "individual" | "organization";

interface DttotRow {
  id: string;
  reference_code: string | null;
  entity_type: EntityType;
  full_name: string;
  aliases: string | null;
  identity_number: string | null;
  place_of_birth: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  source: string | null;
  listed_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

const schema = z.object({
  reference_code: z.string().trim().max(50).optional().or(z.literal("")),
  entity_type: z.enum(["individual", "organization"]),
  full_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(200),
  aliases: z.string().trim().max(500).optional().or(z.literal("")),
  identity_number: z.string().trim().max(100).optional().or(z.literal("")),
  place_of_birth: z.string().trim().max(100).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  nationality: z.string().trim().max(100).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  source: z.string().trim().max(200).optional().or(z.literal("")),
  listed_at: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  is_active: z.boolean(),
});

type FormShape = z.infer<typeof schema>;

const empty: FormShape = {
  reference_code: "",
  entity_type: "individual",
  full_name: "",
  aliases: "",
  identity_number: "",
  place_of_birth: "",
  date_of_birth: "",
  nationality: "",
  address: "",
  source: "",
  listed_at: "",
  notes: "",
  is_active: true,
};

function DttotPage() {
  const { roles } = useCurrentUser();
  const canWrite = hasAnyRole(roles, ["super_admin", "owner", "auditor"]);

  const [rows, setRows] = useState<DttotRow[] | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | EntityType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DttotRow | null>(null);
  const [deleting, setDeleting] = useState<DttotRow | null>(null);
  const [form, setForm] = useState<FormShape>(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("dttot_list")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Gagal memuat DTTOT", { description: error.message });
      return;
    }
    setRows((data as DttotRow[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.entity_type !== typeFilter) return false;
      if (statusFilter === "active" && !r.is_active) return false;
      if (statusFilter === "inactive" && r.is_active) return false;
      if (!needle) return true;
      return (
        r.full_name.toLowerCase().includes(needle) ||
        (r.aliases ?? "").toLowerCase().includes(needle) ||
        (r.identity_number ?? "").toLowerCase().includes(needle) ||
        (r.reference_code ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, typeFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(row: DttotRow) {
    setEditing(row);
    setForm({
      reference_code: row.reference_code ?? "",
      entity_type: row.entity_type,
      full_name: row.full_name,
      aliases: row.aliases ?? "",
      identity_number: row.identity_number ?? "",
      place_of_birth: row.place_of_birth ?? "",
      date_of_birth: row.date_of_birth ?? "",
      nationality: row.nationality ?? "",
      address: row.address ?? "",
      source: row.source ?? "",
      listed_at: row.listed_at ?? "",
      notes: row.notes ?? "",
      is_active: row.is_active,
    });
    setOpen(true);
  }

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Data tidak valid", {
        description: parsed.error.issues[0]?.message,
      });
      return;
    }
    setSaving(true);
    const d = parsed.data;
    const payload = {
      reference_code: d.reference_code || null,
      entity_type: d.entity_type,
      full_name: d.full_name,
      aliases: d.aliases || null,
      identity_number: d.identity_number || null,
      place_of_birth: d.place_of_birth || null,
      date_of_birth: d.date_of_birth || null,
      nationality: d.nationality || null,
      address: d.address || null,
      source: d.source || null,
      listed_at: d.listed_at || null,
      notes: d.notes || null,
      is_active: d.is_active,
    };
    const { error } = editing
      ? await supabase.from("dttot_list").update(payload).eq("id", editing.id)
      : await supabase.from("dttot_list").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }
    toast.success(editing ? "Entri DTTOT diperbarui" : "Entri DTTOT ditambahkan");
    setOpen(false);
    load();
  }

  async function remove() {
    if (!deleting) return;
    const { error } = await supabase
      .from("dttot_list")
      .delete()
      .eq("id", deleting.id);
    setDeleting(null);
    if (error) {
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }
    toast.success("Entri DTTOT dihapus");
    load();
  }

  const activeCount = rows?.filter((r) => r.is_active).length ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <MasterPageHeader
        title="DTTOT"
        description="Daftar Terduga Teroris dan Organisasi Teroris — digunakan untuk screening nasabah pada proses CDD/EDD."
        onAdd={openCreate}
        addLabel="Tambah Entri"
        canWrite={canWrite}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, alias, NIK/paspor, kode referensi…"
              className="pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua tipe</SelectItem>
              <SelectItem value="individual">Perorangan</SelectItem>
              <SelectItem value="organization">Organisasi</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground shrink-0">
            <span className="font-medium text-foreground">{activeCount}</span>{" "}
            aktif · {rows?.length ?? 0} total
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama / Organisasi</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Identitas</TableHead>
                <TableHead>Kebangsaan</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Tgl Daftar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered === null ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center">
                    <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Belum ada entri DTTOT yang sesuai filter.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.reference_code ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.full_name}</div>
                      {row.aliases && (
                        <div className="text-xs text-muted-foreground">
                          alias: {row.aliases}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {row.entity_type === "individual"
                          ? "Perorangan"
                          : "Organisasi"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.identity_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.nationality ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{row.source ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {row.listed_at ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.is_active ? "destructive" : "secondary"}
                      >
                        {row.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleting(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Entri DTTOT" : "Tambah Entri DTTOT"}
            </DialogTitle>
            <DialogDescription>
              Data ini digunakan untuk screening nasabah. Pastikan sumber
              informasi resmi (mis. Perpol / DK-PBB / PPATK).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kode Referensi</Label>
              <Input
                value={form.reference_code ?? ""}
                onChange={(e) =>
                  setForm({ ...form, reference_code: e.target.value })
                }
                placeholder="mis. IDN-001"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipe *</Label>
              <Select
                value={form.entity_type}
                onValueChange={(v) =>
                  setForm({ ...form, entity_type: v as EntityType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Perorangan</SelectItem>
                  <SelectItem value="organization">Organisasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Nama Lengkap / Organisasi *</Label>
              <Input
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                maxLength={200}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Alias</Label>
              <Input
                value={form.aliases ?? ""}
                onChange={(e) => setForm({ ...form, aliases: e.target.value })}
                placeholder="Pisahkan dengan koma"
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label>No. Identitas (NIK/Paspor)</Label>
              <Input
                value={form.identity_number ?? ""}
                onChange={(e) =>
                  setForm({ ...form, identity_number: e.target.value })
                }
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Kebangsaan</Label>
              <Input
                value={form.nationality ?? ""}
                onChange={(e) =>
                  setForm({ ...form, nationality: e.target.value })
                }
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Tempat Lahir</Label>
              <Input
                value={form.place_of_birth ?? ""}
                onChange={(e) =>
                  setForm({ ...form, place_of_birth: e.target.value })
                }
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Lahir</Label>
              <Input
                type="date"
                value={form.date_of_birth ?? ""}
                onChange={(e) =>
                  setForm({ ...form, date_of_birth: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Alamat</Label>
              <Textarea
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label>Sumber</Label>
              <Input
                value={form.source ?? ""}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="Perpol / DK-PBB / PPATK"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Masuk Daftar</Label>
              <Input
                type="date"
                value={form.listed_at ?? ""}
                onChange={(e) =>
                  setForm({ ...form, listed_at: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Catatan</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                maxLength={1000}
              />
            </div>
            <div className="flex items-center gap-3 col-span-2 pt-2">
              <Switch
                id="dttot-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="dttot-active" className="cursor-pointer">
                Entri aktif (digunakan untuk screening)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus entri DTTOT?</AlertDialogTitle>
            <AlertDialogDescription>
              Entri <strong>{deleting?.full_name}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}