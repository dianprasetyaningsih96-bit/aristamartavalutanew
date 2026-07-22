import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowLeftRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Search,
  Ban,
  Printer,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, hasAnyRole } from "@/hooks/use-current-user";
import { useAppSettings } from "@/hooks/use-app-settings";
import { MasterPageHeader } from "@/components/master-data/page-header";
import { generateReceiptPdf } from "@/lib/pdf-receipt";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
});

type TxType = "buy" | "sell";
type TxStatus = "draft" | "completed" | "voided";
type PayMethod = "cash" | "transfer" | "other";

interface Transaction {
  id: string;
  transaction_no: string;
  transaction_type: TxType;
  transaction_date: string;
  customer_id: string | null;
  currency_id: string;
  branch_id: string | null;
  rate: number;
  foreign_amount: number;
  idr_amount: number;
  payment_method: PayMethod;
  status: TxStatus;
  notes: string | null;
  currencies?: { code: string; name: string } | null;
  branches?: { code: string; name: string } | null;
  customers?: { customer_code: string; full_name: string } | null;
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
interface CustomerOpt {
  id: string;
  customer_code: string;
  full_name: string;
  risk_rating: string;
  is_blacklisted: boolean;
}
interface RateRow {
  currency_id: string;
  branch_id: string | null;
  buy_rate: number;
  sell_rate: number;
  effective_date: string;
}

interface ActiveShift {
  id: string;
  branch_id: string;
  shift_type: string;
  status: string;
  opened_at: string;
  branches?: { code: string; name: string } | null;
}

const HQ = "__hq__";
const NO_CUSTOMER = "__walkin__";

const schema = z.object({
  transaction_type: z.enum(["buy", "sell"]),
  currency_id: z.string().uuid("Pilih mata uang"),
  branch_id: z.string(),
  customer_id: z.string(),
  rate: z.coerce.number().positive("Kurs harus > 0"),
  foreign_amount: z.coerce.number().positive("Nominal valas harus > 0"),
  payment_method: z.enum(["cash", "transfer", "other"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

type Form = z.infer<typeof schema>;

const emptyForm = (): Form => ({
  transaction_type: "buy",
  currency_id: "",
  branch_id: HQ,
  customer_id: NO_CUSTOMER,
  rate: 0,
  foreign_amount: 0,
  payment_method: "cash",
  notes: "",
});

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const fmtNum = (n: number, d = 2) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);

// PPATK CDD threshold — Rp 100 juta untuk transaksi tunai
const CDD_THRESHOLD_IDR = 100_000_000;

function TransactionsPage() {
  const { roles, user } = useCurrentUser();
  const { settings } = useAppSettings();
  const canWrite = hasAnyRole(roles, [
    "super_admin",
    "owner",
    "branch_manager",
    "teller",
  ]);
  const canVoid = hasAnyRole(roles, [
    "super_admin",
    "owner",
    "branch_manager",
  ]);

  const [rows, setRows] = useState<Transaction[] | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([]);
  const [branches, setBranches] = useState<BranchOpt[]>([]);
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [rates, setRates] = useState<RateRow[]>([]);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | TxType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | TxStatus>("all");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [mustPrint, setMustPrint] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [voiding, setVoiding] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState("");

  async function load() {
    const [
      { data: trx, error },
      { data: cur },
      { data: br },
      { data: cust },
      { data: rt },
      { data: sh },
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "*, currencies(code, name), branches(code, name), customers(customer_code, full_name)",
        )
        .order("transaction_date", { ascending: false })
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
      supabase
        .from("customers")
        .select("id, customer_code, full_name, risk_rating, is_blacklisted")
        .order("full_name")
        .limit(500),
      supabase
        .from("exchange_rates")
        .select("currency_id, branch_id, buy_rate, sell_rate, effective_date")
        .eq("is_active", true)
        .order("effective_date", { ascending: false })
        .limit(500),
      user?.id
        ? supabase
            .from("shifts")
            .select("id, branch_id, shift_type, status, opened_at, branches(code, name)")
            .eq("user_id", user.id)
            .eq("status", "open")
            .order("opened_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (error) {
      toast.error("Gagal memuat transaksi", { description: error.message });
      return;
    }
    setRows((trx as Transaction[]) ?? []);
    setCurrencies((cur as CurrencyOpt[]) ?? []);
    setBranches((br as BranchOpt[]) ?? []);
    setCustomers((cust as CustomerOpt[]) ?? []);
    setRates((rt as RateRow[]) ?? []);
    setActiveShift((sh as ActiveShift | null) ?? null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-suggest rate ketika mata uang / cabang / tipe berubah
  useEffect(() => {
    if (!form.currency_id) return;
    const branchId = form.branch_id === HQ ? null : form.branch_id;
    const match =
      rates.find(
        (r) => r.currency_id === form.currency_id && r.branch_id === branchId,
      ) ||
      rates.find(
        (r) => r.currency_id === form.currency_id && r.branch_id === null,
      );
    if (match) {
      const suggested =
        form.transaction_type === "buy"
          ? Number(match.buy_rate)
          : Number(match.sell_rate);
      setForm((f) =>
        f.rate === 0 || f.rate === Number(match.buy_rate) || f.rate === Number(match.sell_rate)
          ? { ...f, rate: suggested }
          : f,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.currency_id, form.branch_id, form.transaction_type, rates]);

  const idrAmount = useMemo(
    () => Number((form.rate * form.foreign_amount).toFixed(2)),
    [form.rate, form.foreign_amount],
  );

  const requiresCDD = idrAmount >= CDD_THRESHOLD_IDR;
  const selectedCustomer = customers.find((c) => c.id === form.customer_id);
  const blacklistBlock = selectedCustomer?.is_blacklisted;

  function openCreate(type: TxType) {
    if (!activeShift) {
      toast.error("Shif belum dibuka", {
        description:
          "Buka shif kerja terlebih dahulu di menu Shif Kerja sebelum memulai transaksi.",
      });
      return;
    }
    setForm({
      ...emptyForm(),
      transaction_type: type,
      branch_id: activeShift.branch_id,
    });
    setOpen(true);
  }

  async function save() {
    if (!activeShift) {
      toast.error("Shif belum dibuka", {
        description: "Buka shif kerja dahulu sebelum menyimpan transaksi.",
      });
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Data tidak valid", {
        description: parsed.error.issues[0]?.message,
      });
      return;
    }
    if (blacklistBlock) {
      toast.error("Nasabah masuk daftar hitam", {
        description: "Transaksi tidak dapat diproses.",
      });
      return;
    }
    if (requiresCDD && parsed.data.customer_id === NO_CUSTOMER) {
      toast.error("CDD wajib", {
        description:
          "Transaksi ≥ Rp 100 juta wajib mencantumkan nasabah terdaftar.",
      });
      return;
    }
    setSaving(true);
    const payload = {
      transaction_type: parsed.data.transaction_type,
      currency_id: parsed.data.currency_id,
      branch_id: parsed.data.branch_id === HQ ? null : parsed.data.branch_id,
      customer_id:
        parsed.data.customer_id === NO_CUSTOMER
          ? null
          : parsed.data.customer_id,
      rate: parsed.data.rate,
      foreign_amount: parsed.data.foreign_amount,
      idr_amount: idrAmount,
      payment_method: parsed.data.payment_method,
      status: "completed" as const,
      notes: parsed.data.notes || null,
      teller_id: user?.id ?? null,
    };
    const { data, error } = await supabase
      .from("transactions")
      .insert(payload)
      .select(
        "*, currencies(code, name), branches(code, name), customers(customer_code, full_name)",
      )
      .single();
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }
    toast.success("Transaksi tersimpan", {
      description: (data as Transaction).transaction_no,
    });
    setOpen(false);
    setViewing(data as Transaction);
    setMustPrint(true);
    setPrinted(false);
    load();
  }

  async function doVoid() {
    if (!voiding) return;
    if (!voidReason.trim()) {
      toast.error("Alasan pembatalan wajib diisi");
      return;
    }
    const { error } = await supabase
      .from("transactions")
      .update({
        status: "voided",
        voided_at: new Date().toISOString(),
        voided_by: user?.id ?? null,
        void_reason: voidReason.trim(),
      })
      .eq("id", voiding.id);
    if (error) {
      toast.error("Gagal membatalkan", { description: error.message });
      return;
    }
    toast.success("Transaksi dibatalkan");
    setVoiding(null);
    setVoidReason("");
    load();
  }

  const filtered = useMemo(() => {
    if (!rows) return null;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterType !== "all" && r.transaction_type !== filterType)
        return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (!q) return true;
      return (
        r.transaction_no.toLowerCase().includes(q) ||
        r.currencies?.code.toLowerCase().includes(q) ||
        r.customers?.full_name.toLowerCase().includes(q) ||
        r.customers?.customer_code.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filterType, filterStatus]);

  const stats = useMemo(() => {
    if (!rows) return null;
    const today = new Date().toISOString().slice(0, 10);
    const t = rows.filter(
      (r) => r.transaction_date.slice(0, 10) === today && r.status !== "voided",
    );
    const buy = t
      .filter((r) => r.transaction_type === "buy")
      .reduce((a, r) => a + Number(r.idr_amount), 0);
    const sell = t
      .filter((r) => r.transaction_type === "sell")
      .reduce((a, r) => a + Number(r.idr_amount), 0);
    return { count: t.length, buy, sell, net: sell - buy };
  }, [rows]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <MasterPageHeader
        title="Transaksi"
        description="Pencatatan transaksi beli & jual valuta asing."
        canWrite={false}
        extra={
          canWrite && (
            <>
              <Button
                onClick={() => openCreate("buy")}
                variant="outline"
                className="gap-2"
              >
                <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                Beli Valas
              </Button>
              <Button
                onClick={() => openCreate("sell")}
                className="gap-2"
              >
                <ArrowUpCircle className="h-4 w-4" />
                Jual Valas
              </Button>
            </>
          )
        }
      />

      {canWrite && !activeShift && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Shif belum dibuka</p>
            <p className="opacity-90">
              Anda belum membuka shif kerja. Transaksi tidak dapat dilakukan
              sampai shif (Pagi atau Siang/Sore) dibuka di menu{" "}
              <span className="font-semibold">Shif Kerja</span>.
            </p>
          </div>
        </div>
      )}

      {canWrite && activeShift && (
        <div className="text-xs text-muted-foreground">
          Shif aktif:{" "}
          <span className="font-semibold text-foreground">
            {activeShift.shift_type === "morning" ? "Pagi" : "Siang/Sore"}
          </span>
          {activeShift.branches ? ` · ${activeShift.branches.code} — ${activeShift.branches.name}` : ""}
          {" · dibuka "}
          {new Date(activeShift.opened_at).toLocaleString("id-ID")}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Transaksi Hari Ini" value={String(stats.count)} />
          <StatCard
            label="Beli Valas Hari Ini"
            value={fmtIDR(stats.buy)}
            tone="emerald"
          />
          <StatCard
            label="Jual Valas Hari Ini"
            value={fmtIDR(stats.sell)}
            tone="blue"
          />
          <StatCard
            label="Net Position"
            value={fmtIDR(stats.net)}
            tone={stats.net >= 0 ? "emerald" : "red"}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari no transaksi, mata uang, nasabah…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as "all" | TxType)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua tipe</SelectItem>
            <SelectItem value="buy">Beli Valas</SelectItem>
            <SelectItem value="sell">Jual Valas</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as "all" | TxStatus)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
            <SelectItem value="voided">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Transaksi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Mata Uang</TableHead>
                <TableHead className="text-right">Nominal Valas</TableHead>
                <TableHead className="text-right">Kurs</TableHead>
                <TableHead className="text-right">Total IDR</TableHead>
                <TableHead>Nasabah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-32">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered === null ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={10}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <ArrowLeftRight className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Belum ada transaksi yang cocok.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {r.transaction_no}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(r.transaction_date).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.transaction_type === "buy" ? "default" : "secondary"
                        }
                        className="gap-1"
                      >
                        {r.transaction_type === "buy" ? (
                          <ArrowDownCircle className="h-3 w-3" />
                        ) : (
                          <ArrowUpCircle className="h-3 w-3" />
                        )}
                        {r.transaction_type === "buy" ? "Beli" : "Jual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      {r.currencies?.code}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {fmtNum(Number(r.foreign_amount))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmtNum(Number(r.rate), 4)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {fmtIDR(Number(r.idr_amount))}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.customers ? (
                        <div>
                          <div className="font-medium">
                            {r.customers.full_name}
                          </div>
                          <div className="text-muted-foreground font-mono">
                            {r.customers.customer_code}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">
                          Walk-in
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "completed"
                            ? "default"
                            : r.status === "voided"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {r.status === "completed"
                          ? "Selesai"
                          : r.status === "voided"
                            ? "Batal"
                            : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewing(r)}
                          title="Lihat struk"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        {canVoid && r.status === "completed" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setVoiding(r)}
                            title="Batalkan"
                          >
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {form.transaction_type === "buy" ? (
                <>
                  <ArrowDownCircle className="h-5 w-5 text-emerald-600" /> Beli
                  Valas dari Nasabah
                </>
              ) : (
                <>
                  <ArrowUpCircle className="h-5 w-5 text-primary" /> Jual Valas
                  kepada Nasabah
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {form.transaction_type === "buy"
                ? "Money changer menerima valas, membayar rupiah kepada nasabah."
                : "Money changer menyerahkan valas, menerima rupiah dari nasabah."}
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
              <Label>Cabang</Label>
              <Select
                value={form.branch_id}
                onValueChange={(v) => setForm({ ...form, branch_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={HQ}>HQ / Default</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nominal Valas *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={form.foreign_amount || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    foreign_amount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Kurs *</Label>
              <Input
                type="number"
                step="0.0001"
                min={0}
                value={form.rate || ""}
                onChange={(e) =>
                  setForm({ ...form, rate: Number(e.target.value) })
                }
              />
              <p className="text-[10px] text-muted-foreground">
                Kurs disarankan otomatis dari master kurs aktif — dapat diubah.
              </p>
            </div>

            <div className="col-span-2 rounded-xl bg-muted/40 p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">
                  Total {form.transaction_type === "buy" ? "Dibayar" : "Diterima"} (IDR)
                </div>
                <div className="text-2xl font-bold font-mono">
                  {fmtIDR(idrAmount)}
                </div>
              </div>
              {requiresCDD && (
                <Badge variant="destructive" className="text-xs">
                  Wajib CDD — ≥ Rp 100 jt
                </Badge>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Nasabah {requiresCDD && "*"}</Label>
              <Select
                value={form.customer_id}
                onValueChange={(v) => setForm({ ...form, customer_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CUSTOMER}>
                    Walk-in (tanpa nasabah terdaftar)
                  </SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.customer_code} — {c.full_name}
                      {c.is_blacklisted ? " ⛔" : ""}
                      {c.risk_rating === "high" ? " ⚠️" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {blacklistBlock && (
                <p className="text-xs text-destructive">
                  Nasabah dalam daftar hitam — transaksi diblokir.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <Select
                value={form.payment_method}
                onValueChange={(v) =>
                  setForm({ ...form, payment_method: v as PayMethod })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                maxLength={500}
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={save} disabled={saving || blacklistBlock}>
              {saving ? "Menyimpan…" : "Simpan Transaksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Struk Transaksi
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div id="receipt" className="space-y-3 text-sm">
              <div className="text-center border-b pb-3">
                <div className="font-bold">KUPVA BB</div>
                <div className="text-xs text-muted-foreground">
                  Money Changer — Bukan Bank
                </div>
              </div>
              <ReceiptRow label="No. Transaksi" value={viewing.transaction_no} mono />
              <ReceiptRow
                label="Tanggal"
                value={new Date(viewing.transaction_date).toLocaleString("id-ID")}
              />
              <ReceiptRow
                label="Tipe"
                value={viewing.transaction_type === "buy" ? "Beli Valas" : "Jual Valas"}
              />
              <ReceiptRow
                label="Cabang"
                value={
                  viewing.branches
                    ? `${viewing.branches.code} · ${viewing.branches.name}`
                    : "HQ"
                }
              />
              <ReceiptRow
                label="Nasabah"
                value={
                  viewing.customers
                    ? `${viewing.customers.customer_code} · ${viewing.customers.full_name}`
                    : "Walk-in"
                }
              />
              <div className="border-t pt-3 space-y-2">
                <ReceiptRow
                  label="Mata Uang"
                  value={viewing.currencies?.code ?? "-"}
                  mono
                />
                <ReceiptRow
                  label="Nominal Valas"
                  value={fmtNum(Number(viewing.foreign_amount))}
                  mono
                />
                <ReceiptRow
                  label="Kurs"
                  value={fmtNum(Number(viewing.rate), 4)}
                  mono
                />
              </div>
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="font-semibold">
                  Total {viewing.transaction_type === "buy" ? "Dibayar" : "Diterima"}
                </span>
                <span className="font-bold font-mono text-lg">
                  {fmtIDR(Number(viewing.idr_amount))}
                </span>
              </div>
              <div className="text-[10px] text-center text-muted-foreground pt-2">
                Terima kasih atas transaksi Anda.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                viewing && generateReceiptPdf({
                  transaction_no: viewing.transaction_no,
                  transaction_date: viewing.transaction_date,
                  transaction_type: viewing.transaction_type,
                  branch: viewing.branches ?? null,
                  customer: viewing.customers ?? null,
                  currency: viewing.currencies?.code ?? "-",
                  foreign_amount: Number(viewing.foreign_amount),
                  rate: Number(viewing.rate),
                  idr_amount: Number(viewing.idr_amount),
                  payment_method: viewing.payment_method,
                })
              }
            >
              <Printer className="h-4 w-4" />
              Cetak PDF
            </Button>
            <Button onClick={() => setViewing(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void dialog */}
      <AlertDialog
        open={!!voiding}
        onOpenChange={(o) => {
          if (!o) {
            setVoiding(null);
            setVoidReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi {voiding?.transaction_no} akan ditandai sebagai
              dibatalkan. Data tetap tersimpan untuk audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Alasan Pembatalan *</Label>
            <Textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Jelaskan alasan pembatalan…"
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doVoid}>
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald" | "blue" | "red";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "blue"
        ? "text-primary"
        : tone === "red"
          ? "text-destructive"
          : "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-xl font-bold font-mono mt-1 ${toneCls}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function ReceiptRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </div>
  );
}