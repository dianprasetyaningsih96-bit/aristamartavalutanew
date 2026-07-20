import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Trash2, LineChart } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/rates")({
  component: RatesPage,
});

interface Rate {
  id: string;
  currency_id: string;
  branch_id: string | null;
  buy_rate: number;
  sell_rate: number;
  effective_date: string;
  is_active: boolean;
  note: string | null;
  created_at: string;
  currencies?: { code: string; name: string } | null;
  branches?: { code: string; name: string } | null;
}

interface CurrencyOpt {
  id: string;
  code: string;
  name: string;
}
interface BranchOpt {
  id: string;
  code: string;
  name: string;
}

const HQ = "__hq__";

const schema = z
  .object({
    currency_id: z.string().uuid("Pilih mata uang"),
    branch_id: z.string(),
    buy_rate: z.coerce.number().positive("Kurs beli > 0"),
    sell_rate: z.coerce.number().positive("Kurs jual > 0"),
    effective_date: z.string().min(1),
    is_active: z.boolean(),
    note: z.string().trim().max(255).optional().or(z.literal("")),
  })
  .refine((v) => v.sell_rate >= v.buy_rate, {
    path: ["sell_rate"],
    message: "Kurs jual harus ≥ kurs beli",
  });

type Form = z.infer<typeof schema>;

const today = () => new Date().toISOString().slice(0, 10);

const empty = (): Form => ({
  currency_id: "",
  branch_id: HQ,
  buy_rate: 0,
  sell_rate: 0,
  effective_date: today(),
  is_active: true,
  note: "",
});

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);

function RatesPage() {
  const { roles } = useCurrentUser();
  const canWrite = hasAnyRole(roles, [
    "super_admin",
    "owner",
    "branch_manager",
  ]);

  const [rows, setRows] = useState<Rate[] | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([]);
  const [branches, setBranches] = useState<BranchOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rate | null>(null);
  const [deleting, setDeleting] = useState<Rate | null>(null);
  const [form, setForm] = useState<Form>(empty());
  const [saving, setSaving] = useState(false);

  async function load() {
    const [{ data: rateData, error }, { data: cur }, { data: br }] =
      await Promise.all([
        supabase
          .from("exchange_rates")
          .select(
            "*, currencies(code, name), branches(code, name)",
          )
          .order("effective_date", { ascending: false })
          .limit(200),
        supabase
          .from("currencies")
          .select("id, code, name")
          .eq("is_active", true)
          .order("code"),
        supabase
          .from("branches")
          .select("id, code, name")
          .eq("is_active", true)
          .order("code"),
      ]);
    if (error) {
      toast.error("Gagal memuat kurs", { description: error.message });
      return;
    }
    setRows((rateData as Rate[]) ?? []);
    setCurrencies((cur as CurrencyOpt[]) ?? []);
    setBranches((br as BranchOpt[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const spread = useMemo(() => {
    if (!form.buy_rate || !form.sell_rate) return null;
    const s = form.sell_rate - form.buy_rate;
    const pct = (s / form.buy_rate) * 100;
    return { s, pct };
  }, [form.buy_rate, form.sell_rate]);

  function openCreate() {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  }

  function openEdit(row: Rate) {
    setEditing(row);
    setForm({
      currency_id: row.currency_id,
      branch_id: row.branch_id ?? HQ,
      buy_rate: Number(row.buy_rate),
      sell_rate: Number(row.sell_rate),
      effective_date: row.effective_date,
      is_active: row.is_active,
      note: row.note ?? "",
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
    const payload = {
      currency_id: parsed.data.currency_id,
      branch_id: parsed.data.branch_id === HQ ? null : parsed.data.branch_id,
      buy_rate: parsed.data.buy_rate,
      sell_rate: parsed.data.sell_rate,
      effective_date: parsed.data.effective_date,
      is_active: parsed.data.is_active,
      note: parsed.data.note || null,
    };
    const { error } = editing
      ? await supabase
          .from("exchange_rates")
          .update(payload)
          .eq("id", editing.id)
      : await supabase.from("exchange_rates").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }
    toast.success(editing ? "Kurs diperbarui" : "Kurs ditambahkan");
    setOpen(false);
    load();
  }

  async function remove() {
    if (!deleting) return;
    const { error } = await supabase
      .from("exchange_rates")
      .delete()
      .eq("id", deleting.id);
    setDeleting(null);
    if (error) {
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }
    toast.success("Kurs dihapus");
    load();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <MasterPageHeader
        title="Kurs Valuta"
        description="Kelola kurs beli & jual per cabang dan tanggal efektif."
        onAdd={openCreate}
        addLabel="Tambah Kurs"
        canWrite={canWrite}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Mata Uang</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead className="text-right">Kurs Beli</TableHead>
                <TableHead className="text-right">Kurs Jual</TableHead>
                <TableHead className="text-right">Spread</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === null ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <LineChart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Belum ada kurs yang dicatat.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const sp = Number(row.sell_rate) - Number(row.buy_rate);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm">
                        {row.effective_date}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold">
                          {row.currencies?.code}
                        </span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {row.currencies?.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.branches ? (
                          <span>
                            <span className="font-mono text-xs">
                              {row.branches.code}
                            </span>{" "}
                            {row.branches.name}
                          </span>
                        ) : (
                          <Badge variant="outline">HQ / Default</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(Number(row.buy_rate))}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(Number(row.sell_rate))}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {fmt(sp)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={row.is_active ? "default" : "secondary"}
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Kurs" : "Tambah Kurs"}
            </DialogTitle>
            <DialogDescription>
              Kurs beli dan jual per mata uang, tanggal, dan cabang.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-1">
              <Label>Mata Uang *</Label>
              <Select
                value={form.currency_id}
                onValueChange={(v) => setForm({ ...form, currency_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mata uang" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Cabang</Label>
              <Select
                value={form.branch_id}
                onValueChange={(v) => setForm({ ...form, branch_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={HQ}>HQ / Default (semua)</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kurs Beli *</Label>
              <Input
                type="number"
                step="0.0001"
                min={0}
                value={form.buy_rate || ""}
                onChange={(e) =>
                  setForm({ ...form, buy_rate: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Kurs Jual *</Label>
              <Input
                type="number"
                step="0.0001"
                min={0}
                value={form.sell_rate || ""}
                onChange={(e) =>
                  setForm({ ...form, sell_rate: Number(e.target.value) })
                }
              />
            </div>
            {spread && (
              <div className="col-span-2 text-xs text-muted-foreground">
                Spread: <span className="font-mono">{fmt(spread.s)}</span> (
                {spread.pct.toFixed(2)}%)
              </div>
            )}
            <div className="space-y-2 col-span-1">
              <Label>Tanggal Efektif *</Label>
              <Input
                type="date"
                value={form.effective_date}
                onChange={(e) =>
                  setForm({ ...form, effective_date: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-3 col-span-1 pt-6">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                id="rate-active"
              />
              <Label htmlFor="rate-active" className="cursor-pointer">
                Aktif
              </Label>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Catatan</Label>
              <Input
                value={form.note ?? ""}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                maxLength={255}
                placeholder="Opsional"
              />
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
            <AlertDialogTitle>Hapus kurs?</AlertDialogTitle>
            <AlertDialogDescription>
              Baris kurs ini akan dihapus permanen.
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