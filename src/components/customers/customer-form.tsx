import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CustomerType = "individual" | "corporate";
export type IdType = "ktp" | "passport" | "kitas" | "sim" | "npwp" | "other";
export type RiskRating = "low" | "medium" | "high";
export type KycStatus = "pending" | "verified" | "rejected" | "expired";

export const customerSchema = z.object({
  customer_type: z.enum(["individual", "corporate"]),
  full_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(150),
  id_type: z.enum(["ktp", "passport", "kitas", "sim", "npwp", "other"]),
  id_number: z.string().trim().min(3, "Nomor identitas wajib").max(50),
  id_expiry_date: z.string().optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  place_of_birth: z.string().trim().max(100).optional().or(z.literal("")),
  nationality: z.string().trim().max(3).optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  province: z.string().trim().max(100).optional().or(z.literal("")),
  postal_code: z.string().trim().max(10).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Email tidak valid").max(150).optional().or(z.literal("")),
  occupation: z.string().trim().max(100).optional().or(z.literal("")),
  employer: z.string().trim().max(150).optional().or(z.literal("")),
  source_of_funds: z.string().trim().max(150).optional().or(z.literal("")),
  purpose_of_transaction: z.string().trim().max(150).optional().or(z.literal("")),
  monthly_income_range: z.string().optional().or(z.literal("")),
  company_name: z.string().trim().max(150).optional().or(z.literal("")),
  npwp_number: z.string().trim().max(30).optional().or(z.literal("")),
  business_type: z.string().trim().max(100).optional().or(z.literal("")),
  is_pep: z.boolean(),
  pep_notes: z.string().trim().max(500).optional().or(z.literal("")),
  risk_rating: z.enum(["low", "medium", "high"]),
  kyc_status: z.enum(["pending", "verified", "rejected", "expired"]),
  kyc_notes: z.string().trim().max(1000).optional().or(z.literal("")),
  is_blacklisted: z.boolean(),
  blacklist_reason: z.string().trim().max(500).optional().or(z.literal("")),
  branch_id: z.string().optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const emptyCustomer: CustomerFormValues = {
  customer_type: "individual",
  full_name: "",
  id_type: "ktp",
  id_number: "",
  id_expiry_date: "",
  date_of_birth: "",
  place_of_birth: "",
  nationality: "ID",
  gender: "",
  address: "",
  city: "",
  province: "",
  postal_code: "",
  phone: "",
  email: "",
  occupation: "",
  employer: "",
  source_of_funds: "",
  purpose_of_transaction: "",
  monthly_income_range: "",
  company_name: "",
  npwp_number: "",
  business_type: "",
  is_pep: false,
  pep_notes: "",
  risk_rating: "low",
  kyc_status: "pending",
  kyc_notes: "",
  is_blacklisted: false,
  blacklist_reason: "",
  branch_id: "",
};

export const ID_TYPE_LABEL: Record<IdType, string> = {
  ktp: "KTP",
  passport: "Paspor",
  kitas: "KITAS",
  sim: "SIM",
  npwp: "NPWP",
  other: "Lainnya",
};

export const INCOME_RANGES = [
  "< Rp 5 juta",
  "Rp 5 - 15 juta",
  "Rp 15 - 50 juta",
  "Rp 50 - 100 juta",
  "> Rp 100 juta",
];

export const SOURCE_OF_FUNDS_OPTIONS = [
  "Gaji / Penghasilan Tetap",
  "Hasil Usaha",
  "Investasi",
  "Warisan / Hibah",
  "Penjualan Aset",
  "Lainnya",
];

export const PURPOSE_OPTIONS = [
  "Perjalanan / Wisata",
  "Pendidikan",
  "Kesehatan",
  "Bisnis / Perdagangan",
  "Kebutuhan Pribadi",
  "Lainnya",
];

interface CustomerFormProps {
  onSuccess: (customerId: string) => void;
  onCancel: () => void;
  initialBranchId?: string;
}

export function CustomerForm({ onSuccess, onCancel, initialBranchId }: CustomerFormProps) {
  const { user } = useCurrentUser();
  const [form, setForm] = useState<CustomerFormValues>({
    ...emptyCustomer,
    branch_id: initialBranchId || "",
  });
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);

  useEffect(() => {
    supabase.from("branches").select("id, name, code").eq("is_active", true).order("code").then(({ data }) => {
      if (data) setBranches(data);
    });
  }, []);

  async function save() {
    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) {
      toast.error("Data tidak valid", {
        description: parsed.error.issues[0]?.message,
      });
      return;
    }
    const d = parsed.data;
    setSaving(true);
    const now = new Date().toISOString();
    const payload: Record<string, any> = {
      customer_type: d.customer_type,
      full_name: d.full_name,
      id_type: d.id_type,
      id_number: d.id_number.trim(),
      id_expiry_date: d.id_expiry_date || null,
      date_of_birth: d.date_of_birth || null,
      place_of_birth: d.place_of_birth || null,
      nationality: d.nationality || null,
      gender: d.gender || null,
      address: d.address || null,
      city: d.city || null,
      province: d.province || null,
      postal_code: d.postal_code || null,
      phone: d.phone || null,
      email: d.email || null,
      occupation: d.occupation || null,
      employer: d.employer || null,
      source_of_funds: d.source_of_funds || null,
      purpose_of_transaction: d.purpose_of_transaction || null,
      monthly_income_range: d.monthly_income_range || null,
      company_name: d.company_name || null,
      npwp_number: d.npwp_number || null,
      business_type: d.business_type || null,
      is_pep: d.is_pep,
      pep_notes: d.pep_notes || null,
      risk_rating: d.risk_rating,
      kyc_status: d.kyc_status,
      kyc_notes: d.kyc_notes || null,
      is_blacklisted: d.is_blacklisted,
      blacklist_reason: d.blacklist_reason || null,
      branch_id: d.branch_id || null,
      created_by: user?.id ?? null,
    };
    
    if (d.kyc_status === "verified") {
      payload.kyc_verified_at = now;
      payload.kyc_verified_by = user?.id ?? null;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert(payload)
      .select("id")
      .single();

    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }
    toast.success("Nasabah ditambahkan");
    onSuccess(data.id);
  }

  const isCorporate = form.customer_type === "corporate";

  return (
    <div className="space-y-4 py-2">
      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="identity">Identitas</TabsTrigger>
          <TabsTrigger value="contact">Kontak</TabsTrigger>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Jenis Nasabah *">
              <Select
                value={form.customer_type}
                onValueChange={(v: CustomerType) => setForm({ ...form, customer_type: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Perorangan</SelectItem>
                  <SelectItem value="corporate">Badan Usaha</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cabang">
              <Select
                value={form.branch_id || "none"}
                onValueChange={(v) => setForm({ ...form, branch_id: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tidak ditentukan —</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.code} — {b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nama Lengkap *" className="col-span-2">
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                maxLength={150}
              />
            </Field>
            <Field label="Jenis Identitas *">
              <Select
                value={form.id_type}
                onValueChange={(v: IdType) => setForm({ ...form, id_type: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ID_TYPE_LABEL) as IdType[]).map((k) => (
                    <SelectItem key={k} value={k}>{ID_TYPE_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nomor Identitas *">
              <Input
                value={form.id_number}
                onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                maxLength={50}
              />
            </Field>
            <Field label="Kewarganegaraan">
              <Input
                value={form.nationality ?? ""}
                onChange={(e) => setForm({ ...form, nationality: e.target.value.toUpperCase() })}
                maxLength={3}
              />
            </Field>
            {!isCorporate && (
              <>
                <Field label="Tanggal Lahir">
                  <Input
                    type="date"
                    value={form.date_of_birth ?? ""}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  />
                </Field>
                <Field label="Tempat Lahir">
                  <Input
                    value={form.place_of_birth ?? ""}
                    onChange={(e) => setForm({ ...form, place_of_birth: e.target.value })}
                  />
                </Field>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Alamat" className="col-span-2">
              <Textarea
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                maxLength={255}
                rows={2}
              />
            </Field>
            <Field label="Telepon">
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                maxLength={30}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={150}
              />
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pekerjaan">
              <Input
                value={form.occupation ?? ""}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              />
            </Field>
            <Field label="Sumber Dana">
              <Select
                value={form.source_of_funds || ""}
                onValueChange={(v) => setForm({ ...form, source_of_funds: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OF_FUNDS_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tujuan Transaksi">
              <Select
                value={form.purpose_of_transaction || ""}
                onValueChange={(v) => setForm({ ...form, purpose_of_transaction: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PURPOSE_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="kyc" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status KYC">
              <Select
                value={form.kyc_status}
                onValueChange={(v: KycStatus) => setForm({ ...form, kyc_status: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="verified">Terverifikasi</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Risiko">
              <Select
                value={form.risk_rating}
                onValueChange={(v: RiskRating) => setForm({ ...form, risk_rating: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Rendah</SelectItem>
                  <SelectItem value="medium">Menengah</SelectItem>
                  <SelectItem value="high">Tinggi</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="col-span-2 flex items-center justify-between p-3 border rounded-lg">
              <Label>DTTOT (Daftar Hitam)</Label>
              <Switch
                checked={form.is_blacklisted}
                onCheckedChange={(v) => setForm({ ...form, is_blacklisted: v })}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Batal</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Nasabah"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
