import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock, LogIn, LogOut, Play, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, hasAnyRole } from "@/hooks/use-current-user";
import { useAppSettings } from "@/hooks/use-app-settings";
import { MasterPageHeader } from "@/components/master-data/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/shifts")({
  component: ShiftsPage,
});

type ShiftType = "pagi" | "siang";
type ShiftStatus = "open" | "closed";

interface ShiftRow {
  id: string;
  branch_id: string;
  user_id: string;
  shift_type: ShiftType;
  status: ShiftStatus;
  opening_capital: number;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  branch?: { name: string } | null;
  user?: { full_name: string | null; email: string | null } | null;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  decimals: number;
}

interface Branch { id: string; name: string; code: string }

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatDateTime(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function ShiftsPage() {
  const { user, profile, roles } = useCurrentUser();
  const { settings } = useAppSettings();
  const isManager = hasAnyRole(roles, ["super_admin", "branch_manager", "owner"]);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [myOpenShift, setMyOpenShift] = useState<ShiftRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState<ShiftRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, c, s] = await Promise.all([
      supabase.from("branches").select("id, name, code").eq("is_active", true).order("name"),
      supabase.from("currencies").select("id, code, name, decimals").eq("is_active", true).order("code"),
      supabase
        .from("shifts")
        .select("id, branch_id, user_id, shift_type, status, opening_capital, opened_at, closed_at, notes, branch:branches(name)")
        .order("opened_at", { ascending: false })
        .limit(100),
    ]);
    if (s.error) {
      toast.error("Gagal memuat shif: " + s.error.message);
    }
    setBranches((b.data as Branch[]) ?? []);
    setCurrencies((c.data as Currency[]) ?? []);
    let rows = (s.data as unknown as ShiftRow[]) ?? [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      const map = new Map<string, { full_name: string | null; email: string | null }>();
      (profs ?? []).forEach((p: { id: string; full_name: string | null; email: string | null }) =>
        map.set(p.id, { full_name: p.full_name, email: p.email }),
      );
      rows = rows.map((r) => ({ ...r, user: map.get(r.user_id) ?? null }));
    }
    setShifts(rows);
    setMyOpenShift(rows.find((r) => r.user_id === user?.id && r.status === "open") ?? null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { if (user?.id) load(); }, [user?.id, load]);

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title="Shif Kerja"
        description={`Jam operasional (WITA) — Pagi ${settings.shift_pagi_start}–${settings.shift_pagi_end} · Siang ${settings.shift_siang_start}–${settings.shift_siang_end}`}
        canWrite={!myOpenShift}
        onAdd={() => setOpenDialog(true)}
        addLabel="Buka Shif"
      />

      {myOpenShift && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Shif Aktif Anda — {myOpenShift.shift_type === "pagi" ? "Pagi" : "Siang/Sore"}
                  <TransferValasButton activeShift={myOpenShift} currencies={currencies} />
                </CardTitle>
                <CardDescription>
                  Dibuka {formatDateTime(myOpenShift.opened_at)}
                  {myOpenShift.opening_capital > 0 && (
                    <> · Modal awal: <b>{formatIDR(myOpenShift.opening_capital)}</b></>
                  )}
                </CardDescription>
              </div>
              <Button variant="destructive" onClick={() => setCloseDialog(myOpenShift)} className="gap-2">
                <LogOut className="h-4 w-4" /> Tutup Shif
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Shif</CardTitle>
          <CardDescription>100 shif terakhir dari seluruh cabang</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Petugas</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Shif</TableHead>
                <TableHead>Buka</TableHead>
                <TableHead>Tutup</TableHead>
                <TableHead className="text-right">Modal Awal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Memuat…</TableCell></TableRow>
              ) : shifts.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Belum ada shif</TableCell></TableRow>
              ) : shifts.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.user?.full_name || s.user?.email || "—"}</TableCell>
                  <TableCell>{s.branch?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{s.shift_type === "pagi" ? "Pagi" : "Siang/Sore"}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(s.opened_at)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(s.closed_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.opening_capital > 0 ? formatIDR(s.opening_capital) : "—"}</TableCell>
                  <TableCell>
                    {s.status === "open" ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">Terbuka</Badge>
                    ) : (
                      <Badge variant="secondary">Tertutup</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.status === "open" && (s.user_id === user?.id || isManager) && (
                      <Button size="sm" variant="outline" onClick={() => setCloseDialog(s)} className="gap-1">
                        <Square className="h-3 w-3" /> Tutup
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {openDialog && (
        <OpenShiftDialog
          onClose={() => setOpenDialog(false)}
          onSaved={() => { setOpenDialog(false); load(); }}
          branches={branches}
          defaultBranchId={profile?.branch_id ?? null}
          userId={user?.id ?? ""}
          lockBranch={!isManager}
        />
      )}

      {closeDialog && (
        <CloseShiftDialog
          shift={closeDialog}
          currencies={currencies}
          onClose={() => setCloseDialog(null)}
          onSaved={() => { setCloseDialog(null); load(); }}
          userId={user?.id ?? ""}
        />
      )}
    </div>
  );
}

function OpenShiftDialog({
  onClose, onSaved, branches, defaultBranchId, userId, lockBranch,
}: {
  onClose: () => void; onSaved: () => void;
  branches: Branch[]; defaultBranchId: string | null; userId: string;
  lockBranch: boolean;
}) {
  const [branchId, setBranchId] = useState<string>(defaultBranchId ?? (lockBranch ? "" : branches[0]?.id ?? ""));
  const [shiftType, setShiftType] = useState<ShiftType>("pagi");
  const [openingCapital, setOpeningCapital] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!branchId && !lockBranch && branches.length) setBranchId(branches[0].id);
  }, [branches, branchId, lockBranch]);

  const assignedBranch = branches.find((b) => b.id === defaultBranchId);

  async function submit() {
    if (!branchId) {
      toast.error(lockBranch ? "Anda belum memiliki cabang penugasan. Hubungi admin." : "Pilih cabang");
      return;
    }
    if (!userId) { toast.error("Sesi tidak valid"); return; }
    const capital = shiftType === "pagi" ? Number(openingCapital.replace(/[^\d]/g, "")) || 0 : 0;
    if (shiftType === "pagi" && capital <= 0) {
      toast.error("Modal awal shif pagi wajib diisi");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("shifts").insert({
      branch_id: branchId,
      user_id: userId,
      shift_type: shiftType,
      opening_capital: capital,
      notes: notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("Gagal membuka shif: " + error.message); return; }
    toast.success("Shif dibuka");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LogIn className="h-4 w-4" /> Buka Shif</DialogTitle>
          <DialogDescription>Catat pembukaan shif kerja Anda.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cabang</Label>
            {lockBranch ? (
              <>
                <Input value={assignedBranch?.name ?? "Belum ada cabang penugasan"} disabled />
                <p className="text-xs text-muted-foreground">
                  Anda hanya bisa membuka shif di cabang penugasan Anda.
                </p>
              </>
            ) : (
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label>Jenis Shif</Label>
            <Select value={shiftType} onValueChange={(v) => setShiftType(v as ShiftType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pagi">Shif Pagi (08.00–15.00 WITA)</SelectItem>
                <SelectItem value="siang">Shif Siang/Sore (15.00–22.00 WITA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {shiftType === "pagi" && (
            <div className="space-y-2">
              <Label>Modal Awal (IDR) <span className="text-destructive">*</span></Label>
              <Input
                inputMode="numeric"
                placeholder="Contoh: 50000000"
                value={openingCapital}
                onChange={(e) => setOpeningCapital(e.target.value.replace(/[^\d]/g, ""))}
              />
              <p className="text-xs text-muted-foreground">
                Modal ini akan tercatat sebagai setoran kas IDR ke cabang.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={submit} disabled={saving} className="gap-2">
            <Play className="h-4 w-4" />
            {saving ? "Menyimpan…" : "Buka Shif"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReconRow {
  currency_id: string;
  code: string;
  name: string;
  decimals: number;
  system_balance: number;
  physical_balance: string;
}

function CloseShiftDialog({
  shift, currencies, onClose, onSaved, userId,
}: {
  shift: ShiftRow; currencies: Currency[];
  onClose: () => void; onSaved: () => void; userId: string;
}) {
  const [rows, setRows] = useState<ReconRow[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cash_balances")
        .select("currency_id, balance")
        .eq("branch_id", shift.branch_id);
      const balMap = new Map<string, number>();
      (data ?? []).forEach((r) => balMap.set(r.currency_id as string, Number(r.balance) || 0));
      setRows(
        currencies.map((c) => ({
          currency_id: c.id,
          code: c.code,
          name: c.name,
          decimals: c.decimals,
          system_balance: balMap.get(c.id) ?? 0,
          physical_balance: String(balMap.get(c.id) ?? 0),
        })),
      );
      setLoading(false);
    })();
  }, [shift.branch_id, currencies]);

  const totalDiff = useMemo(
    () => rows.reduce((sum, r) => sum + ((Number(r.physical_balance) || 0) - r.system_balance), 0),
    [rows],
  );

  async function submit() {
    setSaving(true);
    const closedAt = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("shifts")
      .update({ status: "closed", closed_at: closedAt, closed_by: userId, notes: notes || shift.notes })
      .eq("id", shift.id);
    if (updErr) { setSaving(false); toast.error("Gagal menutup shif: " + updErr.message); return; }
    const payload = rows.map((r) => ({
      shift_id: shift.id,
      currency_id: r.currency_id,
      system_balance: r.system_balance,
      physical_balance: Number(r.physical_balance) || 0,
    }));
    if (payload.length) {
      const { error: recErr } = await supabase.from("shift_reconciliations").insert(payload as any);
      if (recErr) { setSaving(false); toast.error("Rekonsiliasi gagal: " + recErr.message); return; }
    }
    setSaving(false);
    toast.success("Shif ditutup & rekonsiliasi tersimpan");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LogOut className="h-4 w-4" /> Tutup Shif — Rekonsiliasi Kas</DialogTitle>
          <DialogDescription>
            Masukkan saldo fisik hasil hitung tunai per mata uang. Sistem akan menghitung selisih terhadap saldo sistem.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Memuat saldo…</p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mata Uang</TableHead>
                  <TableHead className="text-right">Saldo Sistem</TableHead>
                  <TableHead className="text-right">Saldo Fisik</TableHead>
                  <TableHead className="text-right">Selisih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => {
                  const diff = (Number(r.physical_balance) || 0) - r.system_balance;
                  return (
                    <TableRow key={r.currency_id}>
                      <TableCell className="font-medium">{r.code} <span className="text-xs text-muted-foreground">— {r.name}</span></TableCell>
                      <TableCell className="text-right tabular-nums">{r.system_balance.toLocaleString("id-ID", { minimumFractionDigits: r.decimals, maximumFractionDigits: r.decimals })}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="text-right"
                          inputMode="decimal"
                          value={r.physical_balance}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^\d.-]/g, "");
                            setRows((prev) => prev.map((p, i) => i === idx ? { ...p, physical_balance: v } : p));
                          }}
                        />
                      </TableCell>
                      <TableCell className={"text-right tabular-nums " + (diff === 0 ? "" : diff > 0 ? "text-emerald-600" : "text-destructive")}>
                        {diff.toLocaleString("id-ID", { minimumFractionDigits: r.decimals, maximumFractionDigits: r.decimals })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="space-y-2">
          <Label>Catatan tutup shif (opsional)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Kondisi kas, kejadian penting, dll." />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total selisih (semua mata uang, tanpa konversi)</span>
          <span className={"font-semibold tabular-nums " + (totalDiff === 0 ? "" : totalDiff > 0 ? "text-emerald-600" : "text-destructive")}>
            {totalDiff.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={submit} disabled={saving || loading} variant="destructive" className="gap-2">
            <Square className="h-4 w-4" />
            {saving ? "Menyimpan…" : "Tutup Shif"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Send, Check, X } from "lucide-react";

function TransferValasButton({ activeShift, currencies }: { activeShift: ShiftRow, currencies: Currency[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hqBranch, setHqBranch] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    currency_id: "",
    amount: "",
    notes: ""
  });

  async function loadData() {
    const [hqRes, balRes] = await Promise.all([
      supabase.from("branches").select("id, name").eq("is_hq", true).maybeSingle(),
      supabase.from("cash_balances").select("currency_id, balance").eq("branch_id", activeShift.branch_id)
    ]);
    
    // Fallback if is_hq not set yet
    if (!hqRes.data) {
      const { data: fallbackHq } = await supabase.from("branches").select("id, name").ilike("name", "%Jimbaran%").maybeSingle();
      setHqBranch(fallbackHq);
    } else {
      setHqBranch(hqRes.data);
    }
    
    setBalances(balRes.data ?? []);
  }

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  async function handleTransfer() {
    if (!hqBranch) {
      toast.error("Kantor pusat tidak ditemukan. Pastikan cabang Jimbaran sudah diatur sebagai Kantor Pusat.");
      return;
    }
    if (hqBranch.id === activeShift.branch_id) {
      toast.error("Anda berada di Kantor Pusat. Transfer hanya dilakukan oleh cabang ke Kantor Pusat.");
      return;
    }
    if (!form.currency_id || !form.amount) {
      toast.error("Mata uang dan jumlah wajib diisi");
      return;
    }

    const amountNum = Number(form.amount);
    const balance = balances.find(b => b.currency_id === form.currency_id)?.balance ?? 0;
    
    if (amountNum > balance) {
      toast.error("Saldo tidak mencukupi");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("branch_transfers").insert({
      from_branch_id: activeShift.branch_id,
      to_branch_id: hqBranch.id,
      currency_id: form.currency_id,
      amount: amountNum,
      shift_id: activeShift.id,
      sender_id: (supabase.auth as any).session?.user?.id,
      notes: form.notes
    });

    setLoading(false);
    if (error) {
      toast.error("Gagal mentransfer: " + error.message);
      return;
    }

    toast.success("Transfer berhasil dikirim ke Kantor Pusat");
    setOpen(false);
    setForm({ currency_id: "", amount: "", notes: "" });
  }

  // If this IS the HQ branch, show incoming transfers instead of "Transfer Valas"
  const isHq = hqBranch?.id === activeShift.branch_id;

  if (isHq) {
    return <IncomingTransfers branchId={activeShift.branch_id} />;
  }

  return (
    <>
      <Button size="sm" variant="outline" className="ml-2 gap-2" onClick={() => setOpen(true)}>
        <Send className="h-3.5 w-3.5" /> Transfer ke Pusat
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Valas ke Pusat</DialogTitle>
            <DialogDescription>
              Kirim hasil pembelian valas ke Kantor Pusat ({hqBranch?.name ?? "Jimbaran"}). 
              Saldo akan dikurangi dari cabang ini dan menunggu persetujuan pusat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Mata Uang</Label>
              <Select value={form.currency_id} onValueChange={(v) => setForm({ ...form, currency_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih mata uang" /></SelectTrigger>
                <SelectContent>
                  {currencies.map(c => {
                    const bal = balances.find(b => b.currency_id === c.id)?.balance ?? 0;
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name} (Saldo: {bal.toLocaleString()})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={form.amount} 
                onChange={(e) => setForm({ ...form, amount: e.target.value })} 
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input 
                placeholder="Catatan tambahan..." 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })} 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleTransfer} disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function IncomingTransfers({ branchId }: { branchId: string }) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadTransfers() {
    const { data } = await supabase
      .from("branch_transfers")
      .select("*, from_branch:branches!from_branch_id(name), currency:currencies(code)")
      .eq("to_branch_id", branchId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setTransfers(data ?? []);
  }

  useEffect(() => {
    loadTransfers();
    // Subscribe to changes
    const sub = supabase.channel("transfers").on("postgres_changes", { event: "*", schema: "public", table: "branch_transfers" }, loadTransfers).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [branchId]);

  async function updateStatus(id: string, status: "accepted" | "rejected") {
    setLoading(true);
    const { error } = await supabase
      .from("branch_transfers")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    
    setLoading(false);
    if (error) {
      toast.error("Gagal memproses: " + error.message);
      return;
    }
    
    toast.success(status === "accepted" ? "Transfer diterima" : "Transfer ditolak");
    loadTransfers();
  }

  if (transfers.length === 0) return null;

  return (
    <div className="ml-auto flex items-center gap-2">
      <Badge variant="destructive" className="animate-pulse">{transfers.length} Transfer Masuk</Badge>
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">Lihat Transfer</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer Masuk dari Cabang</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dari Cabang</TableHead>
                <TableHead>Mata Uang</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{t.from_branch?.name}</TableCell>
                  <TableCell>{t.currency?.code}</TableCell>
                  <TableCell className="text-right">{Number(t.amount).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" className="text-emerald-600" onClick={() => updateStatus(t.id, "accepted")} disabled={loading}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => updateStatus(t.id, "rejected")} disabled={loading}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { DialogTrigger } from "@/components/ui/dialog";
