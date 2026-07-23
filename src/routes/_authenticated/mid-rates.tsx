import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Trash2, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, hasAnyRole } from "@/hooks/use-current-user";
import { MasterPageHeader } from "@/components/master-data/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authenticated/mid-rates")({
  component: MidRatesPage,
});

interface MidRate {
  id: string;
  currency_id: string;
  period_month: string;
  mid_rate: number;
  note: string | null;
  created_at: string;
  currencies?: { code: string; name: string } | null;
}

interface CurrencyOpt {
  id: string;
  code: string;
  name: string;
}

const schema = z.object({
  currency_id: z.string().uuid("Pilih mata uang"),
  period_month: z.string().min(7),
  mid_rate: z.coerce.number().positive("Kurs tengah > 0"),
  note: z.string().trim().max(255).optional().or(z.literal("")),
});

type Form = z.infer<typeof schema>;

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const empty = (): Form => ({
  currency_id: "",
  period_month: currentMonth(),
  mid_rate: 0,
  note: "",
});

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);

function periodLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function MidRatesPage() {
  const { roles } = useCurrentUser();
  const canWrite = hasAnyRole(roles, [
    "super_admin",
    "owner",
    "branch_manager",
  ]);

  const [rows, setRows] = useState<MidRate[] | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MidRate | null>(null);
  const [deleting, setDeleting] = useState<MidRate | null>(null);
  const [form, setForm] = useState<Form>(empty());
  const [saving, setSaving] = useState(false);

  async function load() {
    const [{ data: rateData, error }, { data: cur }] = await Promise.all([
      supabase
        .from("mid_rates")
        .select("*, currencies(code, name)")
        .order("period_month", { ascending: false })
        .limit(500),
      supabase
        .from("currencies")
        .select("id, code, name")
        .eq("is_active", true)
        .order("code"),
    ]);
    if (error) {
      toast.error("Gagal memuat kurs tengah", { description: error.message });
      return;
    }
    setRows((rateData as MidRate[]) ?? []);
    setCurrencies((cur as CurrencyOpt[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  }

  function openEdit(row: MidRate) {
    setEditing(row);
    setForm({
      currency_id: row.currency_id,
      period_month: row.period_month.slice(0, 7),
      mid_rate: Number(row.mid_rate),
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
      period_month: parsed.data.period_month + "-01",
      mid_rate: parsed.data.mid_rate,
      note: parsed.data.note || null,
    };
    const { error } = editing
      ? await supabase
          .from("mid_rates")
          .update(payload)
          .eq("id", editing.id)
      : await supabase.from("mid_rates").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }
    toast.success(editing ? "Kurs tengah diperbarui" : "Kurs tengah ditambahkan");
    setOpen(false);
    load();
  }

  async function remove() {
    if (!deleting) return;
    const { error } = await supabase
      .from("mid_rates")
      .delete()
      .eq("id", deleting.id);
    setDeleting(null);
    if (error) {
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }
    toast.success("Kurs tengah dihapus");
    load();
  }

  const grouped = useMemo(() => {
    if (!rows) return null;
    return rows;
  }, [rows]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <MasterPageHeader
        title="Kurs Tengah (Mid Rate)"
        description="Kurs tengah per mata uang per bulan — dipakai pada Laporan Kegiatan Usaha Bulanan (LKUB)."
        onAdd={openCreate}
        addLabel="Tambah Kurs Tengah"
        canWrite={canWrite}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Mata Uang</TableHead>
                <TableHead className="text-right">Kurs Tengah</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="w-32 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped === null ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : grouped.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Scale className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Belum ada kurs tengah. Tambahkan untuk setiap mata uang per bulan.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                grouped.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {periodLabel(row.period_month)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-semibold">
                        {row.currencies?.code}
                      </span>
                      <span className="text-muted-foreground text-xs ml-2">
                        {row.currencies?.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {fmt(Number(row.mid_rate))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.note ?? "—"}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Kurs Tengah" : "Tambah Kurs Tengah"}
            </DialogTitle>
            <DialogDescription>
              Kurs tengah per mata uang untuk satu periode bulanan (LKUB).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label>Periode (Bulan) *</Label>
              <Input
                type="month"
                value={form.period_month}
                onChange={(e) =>
                  setForm({ ...form, period_month: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Kurs Tengah *</Label>
              <Input
                type="number"
                step="0.0001"
                min={0}
                value={form.mid_rate || ""}
                onChange={(e) =>
                  setForm({ ...form, mid_rate: Number(e.target.value) })
                }
                placeholder="mis. 17856.0000"
              />
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
            <AlertDialogTitle>Hapus kurs tengah?</AlertDialogTitle>
            <AlertDialogDescription>
              Baris kurs tengah ini akan dihapus permanen.
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