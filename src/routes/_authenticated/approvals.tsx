import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, hasAnyRole } from "@/hooks/use-current-user";
import { MasterPageHeader } from "@/components/master-data/page-header";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/approvals")({
  component: ApprovalsPage,
});

type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";
type ApprovalAction =
  | "void_transaction"
  | "high_value_transaction"
  | "kyc_override"
  | "rate_override"
  | "customer_unblacklist"
  | "cash_adjustment"
  | "other";

interface ApprovalRequest {
  id: string;
  request_no: string;
  action: ApprovalAction;
  title: string;
  reason: string;
  entity_table: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  status: ApprovalStatus;
  branch_id: string | null;
  requested_by: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

const ACTION_LABELS: Record<ApprovalAction, string> = {
  void_transaction: "Void Transaksi",
  high_value_transaction: "Transaksi Nilai Besar",
  kyc_override: "Override KYC",
  rate_override: "Override Kurs",
  customer_unblacklist: "Cabut DTTOT Nasabah",
  cash_adjustment: "Penyesuaian Kas",
  other: "Lainnya",
};

const STATUS_STYLES: Record<ApprovalStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-700 border-red-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ApprovalsPage() {
  const { user, roles, loading: userLoading } = useCurrentUser();
  const canReview = hasAnyRole(roles, [
    "super_admin",
    "branch_manager",
    "owner",
  ]);

  const [rows, setRows] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ApprovalStatus | "all">("pending");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<ApprovalRequest | null>(
    null,
  );
  const [reviewDecision, setReviewDecision] = useState<
    "approved" | "rejected"
  >("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(300);
    if (error) {
      toast.error("Gagal memuat permintaan", { description: error.message });
      setLoading(false);
      return;
    }
    setRows((data as unknown as ApprovalRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!q) return true;
      return (
        r.request_no.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        ACTION_LABELS[r.action].toLowerCase().includes(q)
      );
    });
  }, [rows, tab, search]);

  const stats = useMemo(() => {
    const s = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    for (const r of rows) s[r.status] += 1;
    return s;
  }, [rows]);

  async function submitReview() {
    if (!reviewTarget || !user) return;
    if (reviewDecision === "rejected" && !reviewNotes.trim()) {
      toast.error("Catatan wajib diisi untuk penolakan");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: reviewDecision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes.trim() || null,
      } as any)
      .eq("id", reviewTarget.id);
    setSubmitting(false);
    if (error) {
      toast.error("Gagal menyimpan keputusan", { description: error.message });
      return;
    }
    toast.success(
      reviewDecision === "approved"
        ? "Permintaan disetujui"
        : "Permintaan ditolak",
    );
    setReviewTarget(null);
    setReviewNotes("");
    load();
  }

  async function cancelOwnRequest(row: ApprovalRequest) {
    if (!user || row.requested_by !== user.id || row.status !== "pending")
      return;
    const { error } = await supabase
      .from("approval_requests")
      .update({ status: "cancelled" })
      .eq("id", row.id);
    if (error) {
      toast.error("Gagal membatalkan", { description: error.message });
      return;
    }
    toast.success("Permintaan dibatalkan");
    load();
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title="Persetujuan"
        description="Alur kerja permintaan persetujuan manajemen untuk aksi sensitif."
        onAdd={() => setCreateOpen(true)}
        addLabel="Ajukan Permintaan"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Menunggu"
          value={stats.pending}
          icon={<Clock className="h-4 w-4 text-amber-600" />}
        />
        <StatCard
          label="Disetujui"
          value={stats.approved}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        />
        <StatCard
          label="Ditolak"
          value={stats.rejected}
          icon={<XCircle className="h-4 w-4 text-red-600" />}
        />
        <StatCard
          label="Dibatalkan"
          value={stats.cancelled}
          icon={<XCircle className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="pending">Menunggu</TabsTrigger>
                <TabsTrigger value="approved">Disetujui</TabsTrigger>
                <TabsTrigger value="rejected">Ditolak</TabsTrigger>
                <TabsTrigger value="cancelled">Dibatalkan</TabsTrigger>
                <TabsTrigger value="all">Semua</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nomor, judul, alasan…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Diajukan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || userLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Tidak ada permintaan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const mine = user && r.requested_by === user.id;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">
                          {r.request_no}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ACTION_LABELS[r.action]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <div className="font-medium">{r.title}</div>
                          <div className="line-clamp-1 text-xs text-muted-foreground">
                            {r.reason}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtDateTime(r.requested_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_STYLES[r.status]}
                          >
                            {STATUS_LABELS[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === "pending" && canReview && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReviewTarget(r);
                                setReviewDecision("approved");
                                setReviewNotes("");
                              }}
                            >
                              Tinjau
                            </Button>
                          )}
                          {r.status === "pending" && mine && !canReview && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelOwnRequest(r)}
                            >
                              Batalkan
                            </Button>
                          )}
                          {r.status !== "pending" && r.review_notes && (
                            <span
                              className="text-xs text-muted-foreground"
                              title={r.review_notes}
                            >
                              catatan tersedia
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={user?.id ?? null}
        onCreated={load}
      />

      <Dialog
        open={!!reviewTarget}
        onOpenChange={(o) => !o && setReviewTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tinjau Permintaan</DialogTitle>
            <DialogDescription>
              {reviewTarget?.request_no} · {reviewTarget && ACTION_LABELS[reviewTarget.action]}
            </DialogDescription>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-3">
              <div className="rounded-md border p-3">
                <div className="text-sm font-medium">{reviewTarget.title}</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {reviewTarget.reason}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Keputusan</Label>
                <Select
                  value={reviewDecision}
                  onValueChange={(v) =>
                    setReviewDecision(v as "approved" | "rejected")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Setujui</SelectItem>
                    <SelectItem value="rejected">Tolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Catatan{reviewDecision === "rejected" && " (wajib)"}
                </Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Alasan / catatan tinjauan"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setReviewTarget(null)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button onClick={submitReview} disabled={submitting}>
              Simpan Keputusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-2xl font-bold">{value}</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateRequestDialog({
  open,
  onOpenChange,
  userId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  onCreated: () => void;
}) {
  const [action, setAction] = useState<ApprovalAction>("void_transaction");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [entityTable, setEntityTable] = useState("");
  const [entityId, setEntityId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setAction("void_transaction");
    setTitle("");
    setReason("");
    setEntityTable("");
    setEntityId("");
  }

  async function submit() {
    if (!userId) return;
    if (!title.trim() || !reason.trim()) {
      toast.error("Judul dan alasan wajib diisi");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("approval_requests").insert({
      action,
      title: title.trim(),
      reason: reason.trim(),
      entity_table: entityTable.trim() || null,
      entity_id: entityId.trim() || null,
      requested_by: userId,
      requester_id: userId,
      status: "pending",
      request_no: `APP-${Date.now()}`,
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error("Gagal mengajukan", { description: error.message });
      return;
    }
    toast.success("Permintaan diajukan");
    reset();
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajukan Permintaan Persetujuan</DialogTitle>
          <DialogDescription>
            Isi jenis aksi, judul singkat, dan alasan detail.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Jenis Aksi</Label>
            <Select
              value={action}
              onValueChange={(v) => setAction(v as ApprovalAction)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACTION_LABELS) as ApprovalAction[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Judul</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Void TRX-20260721-0007"
            />
          </div>
          <div className="space-y-2">
            <Label>Alasan / Detail</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Jelaskan alasan permintaan…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tabel Terkait (opsional)</Label>
              <Input
                value={entityTable}
                onChange={(e) => setEntityTable(e.target.value)}
                placeholder="transactions"
              />
            </div>
            <div className="space-y-2">
              <Label>ID Entitas (opsional)</Label>
              <Input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="uuid"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button onClick={submit} disabled={submitting}>
            Ajukan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}