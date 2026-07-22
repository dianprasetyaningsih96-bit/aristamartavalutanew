import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, hasAnyRole } from "@/hooks/use-current-user";
import { MasterPageHeader } from "@/components/master-data/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/cash")({
  component: CashPage,
});

interface Branch {
  id: string;
  code: string;
  name: string;
}
interface Currency {
  id: string;
  code: string;
  name: string;
  decimals: number;
}
interface Balance {
  id: string;
  branch_id: string;
  currency_id: string;
  balance: number;
  updated_at: string;
  currencies?: Currency | null;
  branches?: { code: string; name: string } | null;
}
interface Movement {
  id: string;
  branch_id: string;
  currency_id: string;
  movement_type: string;
  amount: number;
  balance_after: number | null;
  reference_no: string | null;
  notes: string | null;
  created_at: string;
  currencies?: { code: string } | null;
  branches?: { code: string; name: string } | null;
}

type MovementKind = "deposit" | "withdrawal" | "adjustment" | "opening";

const KIND_LABEL: Record<string, string> = {
  opening: "Saldo Awal",
  deposit: "Setoran Kas",
  withdrawal: "Pengeluaran Kas",
  adjustment: "Penyesuaian",
  buy: "Transaksi Beli",
  sell: "Transaksi Jual",
  transfer_in: "Transfer Masuk",
  transfer_out: "Transfer Keluar",
};

const movementSchema = z.object({
  branch_id: z.string().uuid("Pilih cabang"),
  currency_id: z.string().uuid("Pilih mata uang"),
  kind: z.enum(["deposit", "withdrawal", "adjustment", "opening"]),
  amount: z.number().positive("Nominal harus > 0"),
  notes: z.string().max(500).optional(),
});

function fmt(n: number, decimals = 2) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function CashPage() {
  const { roles, user } = useCurrentUser();
  const canWrite = hasAnyRole(roles, [
    "super_admin",
    "branch_manager",
    "teller",
    "owner",
  ]);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [branchId, setBranchId] = useState<string>("");
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [movements, setMovements] = useState<Movement[] | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    branch_id: "",
    currency_id: "",
    kind: "deposit" as MovementKind,
    amount: "",
    notes: "",
  });

  async function loadRefs() {
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase
        .from("branches")
        .select("id, code, name")
        .eq("is_active", true)
        .order("code"),
      supabase
        .from("currencies")
        .select("id, code, name, decimals")
        .eq("is_active", true)
        .order("code"),
    ]);
    setBranches((b as Branch[]) ?? []);
    setCurrencies((c as Currency[]) ?? []);
    if (!branchId && b && b.length > 0) setBranchId(b[0].id);
  }

  async function loadData(bId: string) {
    setBalances(null);
    setMovements(null);
    const isAll = bId === "__all__" || !bId;
    let balQ = supabase
      .from("cash_balances")
      .select("*, currencies(id, code, name, decimals), branches(code, name)");
    let mvQ = supabase
      .from("cash_movements")
      .select("*, currencies(code), branches(code, name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!isAll) {
      balQ = balQ.eq("branch_id", bId);
      mvQ = mvQ.eq("branch_id", bId);
    }
    const [{ data: bal, error: e1 }, { data: mv, error: e2 }] =
      await Promise.all([balQ, mvQ]);
    if (e1) toast.error("Gagal memuat saldo", { description: e1.message });
    if (e2) toast.error("Gagal memuat mutasi", { description: e2.message });
    setBalances((bal as Balance[]) ?? []);
    setMovements((mv as Movement[]) ?? []);
  }

  useEffect(() => {
    loadRefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (branchId) loadData(branchId);
  }, [branchId]);

  function openCreate() {
    setForm({
      branch_id: branchId,
      currency_id: "",
      kind: "deposit",
      amount: "",
      notes: "",
    });
    setOpen(true);
  }

  async function save() {
    const parsed = movementSchema.safeParse({
      branch_id: form.branch_id,
      currency_id: form.currency_id,
      kind: form.kind,
      amount: Number(form.amount),
      notes: form.notes,
    });
    if (!parsed.success) {
      toast.error("Data tidak valid", {
        description: parsed.error.issues[0]?.message,
      });
      return;
    }
    setSaving(true);
    const { kind, amount } = parsed.data;
    // opening / adjustment bisa negatif jika pengurangan? Buat sederhana: adjustment bisa +/-
    // Untuk kesederhanaan UI: deposit/opening = +, withdrawal = -, adjustment = user memasukkan positif namun pilih tanda via kind
    const signed =
      kind === "withdrawal" ? -Math.abs(amount) : Math.abs(amount);

    const { error } = await supabase.from("cash_movements").insert({
      branch_id: parsed.data.branch_id,
      currency_id: parsed.data.currency_id,
      movement_type: kind,
      amount: signed,
      notes: parsed.data.notes || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan mutasi", { description: error.message });
      return;
    }
    toast.success("Mutasi kas dicatat");
    setOpen(false);
    loadData(branchId);
  }

  const totals = useMemo(() => {
    if (!balances) return { currencies: 0, idrEquiv: 0 };
    return {
      currencies: balances.filter((b) => (b.balance ?? 0) !== 0).length,
      idrEquiv:
        balances.find((b) => b.currencies?.code === "IDR")?.balance ?? 0,
    };
  }, [balances]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <MasterPageHeader
        title="Kas & Inventaris"
        description="Pantau saldo kas per mata uang di tiap cabang dan catat setoran / pengeluaran kas."
        onAdd={openCreate}
        addLabel="Catat Mutasi"
        canWrite={canWrite && branches.length > 0}
        extra={
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Pilih cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua Cabang</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Rupiah</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {fmt(totals.idrEquiv, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Kas rupiah di cabang ini
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Mata Uang Aktif
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.currencies}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Mata uang dengan saldo tidak nol
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Mutasi (50 terakhir)
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {movements?.length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mutasi terbaru di cabang ini
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldo per Mata Uang</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Terakhir Diperbarui</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances === null ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : balances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Banknote className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Belum ada saldo. Catat saldo awal untuk memulai.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                balances
                  .slice()
                  .sort((a, b) =>
                    (a.currencies?.code ?? "").localeCompare(
                      b.currencies?.code ?? "",
                    ),
                  )
                  .map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-semibold">
                        {b.currencies?.code}
                      </TableCell>
                      <TableCell>{b.currencies?.name}</TableCell>
                      <TableCell className="text-xs">
                        {b.branches ? `${b.branches.code} — ${b.branches.name}` : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${b.balance < 0 ? "text-destructive" : ""}`}
                      >
                        {fmt(b.balance, b.currencies?.decimals ?? 2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(b.updated_at).toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mutasi Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Mata Uang</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead className="text-right">Saldo Setelah</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements === null ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <p className="text-sm text-muted-foreground">
                      Belum ada mutasi kas.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => {
                  const isIn = m.amount >= 0;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {m.branches ? `${m.branches.code}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isIn ? "default" : "secondary"}
                          className="gap-1"
                        >
                          {isIn ? (
                            <ArrowDownCircle className="h-3 w-3" />
                          ) : (
                            <ArrowUpCircle className="h-3 w-3" />
                          )}
                          {KIND_LABEL[m.movement_type] ?? m.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {m.currencies?.code}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${isIn ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {isIn ? "+" : ""}
                        {fmt(m.amount, 2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {m.balance_after !== null
                          ? fmt(m.balance_after, 2)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">
                        {m.reference_no ? `[${m.reference_no}] ` : ""}
                        {m.notes ?? "—"}
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
            <DialogTitle>Catat Mutasi Kas</DialogTitle>
            <DialogDescription>
              Setoran menambah saldo, pengeluaran mengurangi saldo. Penyesuaian
              & saldo awal bertanda positif.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Cabang *</Label>
              <Select
                value={form.branch_id}
                onValueChange={(v) => setForm({ ...form, branch_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih cabang" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jenis Mutasi *</Label>
              <Select
                value={form.kind}
                onValueChange={(v) =>
                  setForm({ ...form, kind: v as MovementKind })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opening">Saldo Awal (+)</SelectItem>
                  <SelectItem value="deposit">Setoran Kas (+)</SelectItem>
                  <SelectItem value="withdrawal">
                    Pengeluaran Kas (−)
                  </SelectItem>
                  <SelectItem value="adjustment">Penyesuaian (+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-2 col-span-2">
              <Label>Nominal *</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Catatan</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="mis. Setoran modal awal, biaya operasional, dsb."
                maxLength={500}
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
    </div>
  );
}