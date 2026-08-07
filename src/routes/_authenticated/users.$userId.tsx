import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Activity, ArrowLeftRight, ShieldCheck, Mail, Phone, Building2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import { useCurrentUser, hasAnyRole } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/users/$userId")({
  component: UserDetailPage,
});

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

interface AuditRow {
  id: string;
  table_name: string;
  record_id: string | null;
  action: "insert" | "update" | "delete";
  changed_fields: string[] | null;
  created_at: string;
}

interface TxRow {
  id: string;
  transaction_no: string;
  transaction_type: "buy" | "sell";
  transaction_date: string;
  rate: number;
  foreign_amount: number;
  idr_amount: number;
  status: "draft" | "completed" | "voided";
  currency_id: string;
  branch_id: string | null;
}

const ROLE_STYLES: Record<AppRole, string> = {
  super_admin: "bg-red-500/15 text-red-700 border-red-500/30",
  owner: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  branch_manager: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  teller: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  auditor: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

function fmtDate(d: string) {
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UserDetailPage() {
  const { userId } = useParams({ from: "/_authenticated/users/$userId" });
  const { roles: myRoles, loading: userLoading } = useCurrentUser();
  const canView = hasAnyRole(myRoles, ["super_admin", "owner", "auditor"]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [currencies, setCurrencies] = useState<Map<string, string>>(new Map());
  const [branches, setBranches] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading || !canView) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [pRes, rRes, aRes, tRes, cRes, bRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, email, phone, avatar_url, branch_id, is_active, created_at, updated_at",
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase
          .from("audit_logs")
          .select("id, table_name, record_id, action, changed_fields, created_at")
          .eq("actor_id", userId)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("transactions")
          .select(
            "id, transaction_no, transaction_type, transaction_date, rate, foreign_amount, idr_amount, status, currency_id, branch_id",
          )
          .eq("teller_id", userId)
          .order("transaction_date", { ascending: false })
          .limit(200),
        supabase.from("currencies").select("id, code"),
        supabase.from("branches").select("id, code, name"),
      ]);
      if (cancelled) return;
      if (pRes.error) toast.error("Gagal memuat profil", { description: pRes.error.message });
      const prof = (pRes.data as Profile) ?? null;
      setProfile(prof);
      setRoles(((rRes.data as { role: AppRole }[]) ?? []).map((r) => r.role));
      setAudit((aRes.data as unknown as AuditRow[]) ?? []);
      setTxs((tRes.data as TxRow[]) ?? []);
      const cm = new Map<string, string>();
      for (const c of (cRes.data as { id: string; code: string }[]) ?? []) cm.set(c.id, c.code);
      setCurrencies(cm);
      const bm = new Map<string, string>();
      for (const b of (bRes.data as Branch[]) ?? []) bm.set(b.id, `${b.code} · ${b.name}`);
      setBranches(bm);
      if (prof?.branch_id) {
        const found = ((bRes.data as Branch[]) ?? []).find((b) => b.id === prof.branch_id);
        setBranch(found ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, userLoading, canView]);

  const txStats = useMemo(() => {
    const active = txs.filter((t) => t.status === "completed");
    const buy = active.filter((t) => t.transaction_type === "buy");
    const sell = active.filter((t) => t.transaction_type === "sell");
    const sum = (arr: TxRow[]) => arr.reduce((s, t) => s + Number(t.idr_amount), 0);
    return {
      total: active.length,
      voided: txs.filter((t) => t.status === "voided").length,
      buyIdr: sum(buy),
      sellIdr: sum(sell),
    };
  }, [txs]);

  if (!userLoading && !canView) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Anda tidak memiliki akses ke halaman ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/users">
            <ArrowLeft className="mr-1 h-4 w-4" /> Kembali
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detail User</h1>
          <p className="text-sm text-muted-foreground">
            Profil, aktivitas audit, dan riwayat transaksi teller.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-96" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : !profile ? (
            <div className="text-sm text-muted-foreground">
              User tidak ditemukan.
            </div>
          ) : (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[image:var(--gradient-glow)] text-2xl font-bold text-primary-foreground shadow-lg">
                {(profile.full_name ?? profile.email ?? "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">
                      {profile.full_name ?? "—"}
                    </h2>
                    {profile.is_active ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                      >
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Nonaktif
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {roles.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Belum ada peran
                      </span>
                    ) : (
                      roles.map((r) => (
                        <Badge key={r} variant="outline" className={ROLE_STYLES[r]}>
                          {ROLE_LABELS[r]}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <InfoLine icon={<Mail className="h-4 w-4" />} label={profile.email ?? "—"} />
                  <InfoLine
                    icon={<Phone className="h-4 w-4" />}
                    label={profile.phone ?? "—"}
                  />
                  <InfoLine
                    icon={<Building2 className="h-4 w-4" />}
                    label={branch ? `${branch.code} · ${branch.name}` : "Tanpa cabang"}
                  />
                  <InfoLine
                    icon={<Calendar className="h-4 w-4" />}
                    label={`Terdaftar ${fmtDate(profile.created_at)}`}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Transaksi Selesai" value={NUM.format(txStats.total)} icon={<ArrowLeftRight className="h-4 w-4 text-emerald-600" />} />
        <StatCard label="Total Beli" value={IDR.format(txStats.buyIdr)} icon={<ArrowLeftRight className="h-4 w-4 text-blue-600" />} />
        <StatCard label="Total Jual" value={IDR.format(txStats.sellIdr)} icon={<ArrowLeftRight className="h-4 w-4 text-purple-600" />} />
        <StatCard label="Void" value={NUM.format(txStats.voided)} icon={<ShieldCheck className="h-4 w-4 text-red-600" />} />
      </div>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">
            <Activity className="mr-1 h-4 w-4" /> Aktivitas
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <ArrowLeftRight className="mr-1 h-4 w-4" /> Riwayat Transaksi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jejak Aktivitas Audit</CardTitle>
              <p className="text-xs text-muted-foreground">
                200 aktivitas terakhir yang tercatat pada audit trail.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Aksi</TableHead>
                      <TableHead>Tabel</TableHead>
                      <TableHead>Perubahan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : audit.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                          Belum ada aktivitas tercatat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      audit.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {fmtDate(a.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                a.action === "insert"
                                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                  : a.action === "update"
                                    ? "bg-blue-500/15 text-blue-700 border-blue-500/30"
                                    : "bg-red-500/15 text-red-700 border-red-500/30"
                              }
                            >
                              {a.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {a.table_name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {a.changed_fields && a.changed_fields.length > 0
                              ? a.changed_fields.join(", ")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Riwayat Transaksi Teller</CardTitle>
              <p className="text-xs text-muted-foreground">
                200 transaksi terakhir yang diproses oleh user ini.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>No. Transaksi</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Mata Uang</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead className="text-right">Nilai IDR</TableHead>
                      <TableHead>Cabang</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={8}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : txs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                          Belum ada transaksi yang diproses.
                        </TableCell>
                      </TableRow>
                    ) : (
                      txs.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {fmtDate(t.transaction_date)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {t.transaction_no}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                t.transaction_type === "buy"
                                  ? "bg-blue-500/15 text-blue-700 border-blue-500/30"
                                  : "bg-purple-500/15 text-purple-700 border-purple-500/30"
                              }
                            >
                              {t.transaction_type === "buy" ? "Beli" : "Jual"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {currencies.get(t.currency_id) ?? "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {NUM.format(Number(t.foreign_amount))}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {IDR.format(Number(t.idr_amount))}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.branch_id ? branches.get(t.branch_id) ?? "—" : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                t.status === "completed"
                                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                  : t.status === "voided"
                                    ? "bg-red-500/15 text-red-700 border-red-500/30"
                                    : "text-muted-foreground"
                              }
                            >
                              {t.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoLine({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="text-muted-foreground/70">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-lg font-bold">{value}</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}