import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, hasAnyRole } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CustomerDoc {
  id: string;
  customer_id: string;
  doc_type: string;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
  notes: string | null;
}

const DOC_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "ktp", label: "KTP" },
  { value: "passport", label: "Paspor" },
  { value: "kitas", label: "KITAS/KITAP" },
  { value: "sim", label: "SIM" },
  { value: "npwp", label: "NPWP" },
  { value: "selfie", label: "Selfie + Identitas" },
  { value: "proof_address", label: "Bukti Alamat" },
  { value: "proof_funds", label: "Bukti Sumber Dana" },
  { value: "company_deed", label: "Akta Perusahaan" },
  { value: "siup", label: "SIUP / NIB" },
  { value: "other", label: "Lainnya" },
};

const BUCKET = "kyc-docs";
const MAX_MB = 10;

function formatBytes(n: number | null): string {
  if (!n) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  customerCode: string;
}

export function CustomerDocumentsDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  customerCode,
}: Props) {
  const { user, roles } = useCurrentUser();
  const canWrite = hasAnyRole(roles, [
    "super_admin",
    "branch_manager",
    "teller",
    "owner",
  ]);
  const canDelete = hasAnyRole(roles, [
    "super_admin",
    "branch_manager",
    "owner",
  ]);

  const [docs, setDocs] = useState<CustomerDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<string>("ktp");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_documents")
      .select("*")
      .eq("customer_id", customerId)
      .order("uploaded_at", { ascending: false });
    if (error) toast.error("Gagal memuat dokumen", { description: error.message });
    setDocs((data ?? []) as CustomerDoc[]);
    setLoading(false);
  }

  useEffect(() => {
    if (open) {
      load();
      setFile(null);
      setNotes("");
      setDocType("ktp");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId]);

  async function handleUpload() {
    if (!file) {
      toast.error("Pilih file terlebih dahulu");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Ukuran file melebihi ${MAX_MB} MB`);
      return;
    }
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Tipe file tidak didukung", {
        description: "Gunakan JPG, PNG, WEBP, atau PDF.",
      });
      return;
    }
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${customerId}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
    if (upErr) {
      setUploading(false);
      toast.error("Upload gagal", { description: upErr.message });
      return;
    }
    const { error: insErr } = await supabase.from("customer_documents").insert({
      customer_id: customerId,
      doc_type: docType,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: user?.id ?? null,
      notes: notes.trim() || null,
    });
    setUploading(false);
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast.error("Gagal menyimpan metadata", { description: insErr.message });
      return;
    }
    toast.success("Dokumen diunggah");
    setFile(null);
    setNotes("");
    const input = document.getElementById("kyc-file-input") as HTMLInputElement | null;
    if (input) input.value = "";
    load();
  }

  async function handleDownload(doc: CustomerDoc) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.file_path, 60);
    if (error || !data) {
      toast.error("Gagal membuat link unduh", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function handleDelete(doc: CustomerDoc) {
    if (!confirm(`Hapus dokumen "${doc.file_name ?? doc.file_path}"?`)) return;
    const { error: rmErr } = await supabase.storage
      .from(BUCKET)
      .remove([doc.file_path]);
    if (rmErr) {
      toast.error("Gagal menghapus file", { description: rmErr.message });
      return;
    }
    const { error } = await supabase
      .from("customer_documents")
      .delete()
      .eq("id", doc.id);
    if (error) {
      toast.error("Gagal menghapus metadata", { description: error.message });
      return;
    }
    toast.success("Dokumen dihapus");
    load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Dokumen KYC
          </DialogTitle>
          <DialogDescription>
            {customerCode} — {customerName}
          </DialogDescription>
        </DialogHeader>

        {canWrite && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Jenis Dokumen</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kyc-file-input">
                  File (JPG/PNG/WEBP/PDF, maks {MAX_MB}MB)
                </Label>
                <Input
                  id="kyc-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mis. dokumen kadaluarsa 2028, hasil verifikasi..."
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleUpload} disabled={uploading || !file} className="gap-2">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Unggah
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jenis</TableHead>
                <TableHead>Nama File</TableHead>
                <TableHead>Ukuran</TableHead>
                <TableHead>Diunggah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Belum ada dokumen.
                  </TableCell>
                </TableRow>
              ) : (
                docs.map((d) => {
                  const label =
                    DOC_TYPE_OPTIONS.find((o) => o.value === d.doc_type)?.label ??
                    d.doc_type;
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Badge variant="secondary">{label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate" title={d.file_name ?? ""}>
                        {d.file_name ?? d.file_path}
                        {d.notes && (
                          <div className="text-xs text-muted-foreground truncate">
                            {d.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatBytes(d.size_bytes)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(d.uploaded_at).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDownload(d)}
                            title="Unduh"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(d)}
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}