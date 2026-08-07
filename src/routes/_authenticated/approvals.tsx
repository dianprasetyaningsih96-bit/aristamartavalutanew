import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, CheckCircle, XCircle, Clock, Building2, Eye, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, hasAnyRole } from "@/hooks/use-current-user";
import { MasterPageHeader } from "@/components/master-data/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/approvals")({
  component: ApprovalsPage,
});

interface Transfer {
  id: string;
  branch_id: string;
  target_branch_id: string | null;
  currency_id: string;
  amount: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  notes: string | null;
  branch?: { name: string; code: string } | null;
  target_branch?: { name: string; code: string } | null;
  currency?: { code: string; name: string } | null;
}

function ApprovalsPage() {
  const { roles, profile } = useCurrentUser();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<Transfer | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [branchInfo, setBranchInfo] = useState<{ is_head_office: boolean } | null>(null);

  const canApprove = hasAnyRole(roles, ["super_admin", "owner", "branch_manager", "teller"]) && (hasAnyRole(roles, ["super_admin"]) || branchInfo?.is_head_office);

  useEffect(() => {
    if (profile?.branch_id) {
      supabase.from("branches").select("is_head_office").eq("id", profile.branch_id).single().then(({ data }) => {
        setBranchInfo(data);
      });
    }
  }, [profile?.branch_id]);

  async function load() {
    setLoading(true);
    // Use hints to resolve ambiguous relationships between branch_transfers and branches
    // branch_id -> branch, target_branch_id -> target_branch
    const { data, error } = await supabase
      .from("branch_transfers")
      .select(`
        *, 
        branch:branches!branch_transfers_branch_id_fkey(name, code),
        target_branch:branches!branch_transfers_target_branch_id_fkey(name, code),
        currency:currencies(code, name)
      `)
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Gagal memuat data transfer: " + error.message);
    } else {
      setTransfers((data as unknown as Transfer[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAction(transfer: Transfer, status: "accepted" | "rejected", notes?: string) {
    setProcessing(transfer.id);
    const { error } = await supabase.rpc("process_branch_transfer", {
      transfer_id: transfer.id,
      p_status: status,
      p_notes: notes || ""
    });

    if (error) {
      toast.error("Gagal memproses transfer: " + error.message);
    } else {
      toast.success(status === "accepted" ? "Transfer diterima" : "Transfer ditolak");
      load();
    }
    setProcessing(null);
    setRejectDialog(null);
    setRejectReason("");
  }

  return (
    <div className="space-y-6 p-6">
      <MasterPageHeader
        title="Persetujuan Transfer"
        description="Daftar pengiriman valas dari cabang ke Kantor Pusat yang menunggu persetujuan."
        canWrite={false}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transfer Valas Cabang</CardTitle>
          <CardDescription>
            Kelola pengiriman stok valas dari cabang-cabang ke brankas Kantor Pusat.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Asal</TableHead>
                <TableHead>Tujuan</TableHead>
                <TableHead>Valuta</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Memuat...</TableCell></TableRow>
              ) : transfers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Tidak ada data transfer</TableCell></TableRow>
              ) : transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{t.branch?.name}</div>
                    <div className="text-xs text-muted-foreground">{t.branch?.code}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono font-bold">{t.currency?.code}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {t.amount.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === "pending" ? "outline" : t.status === "accepted" ? "default" : "destructive"}>
                      {t.status === "pending" ? "Menunggu" : t.status === "accepted" ? "Diterima" : "Ditolak"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === "pending" && canApprove && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleAction(t, "accepted")}
                          disabled={!!processing}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" /> Terima
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-destructive text-destructive hover:bg-destructive/5"
                          onClick={() => setRejectDialog(t)}
                          disabled={!!processing}
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" /> Tolak
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Transfer Valas</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan transfer dari cabang {rejectDialog?.branch?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Contoh: Selisih fisik, harap hitung ulang..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || !!processing}
              onClick={() => rejectDialog && handleAction(rejectDialog, "rejected", rejectReason)}
            >
              Tolak Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
