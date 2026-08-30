import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Save,
  PlugZap,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_PROJECT_ID, SUPABASE_URL } from "@/integrations/supabase/config";
import { useCurrentUser, hasAnyRole } from "@/hooks/use-current-user";
import { useAppSettings } from "@/hooks/use-app-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { roles, loading: userLoading } = useCurrentUser();
  const canEdit = hasAnyRole(roles, ["super_admin", "owner"]);
  const { settings, refresh, loading } = useAppSettings();
  const [companyName, setCompanyName] = useState(settings.company_name);
  const [companyAddress, setCompanyAddress] = useState(settings.company_address);
  const [companyPhone, setCompanyPhone] = useState(settings.company_phone);
  const [licensePva, setLicensePva] = useState(settings.license_pva);
  const [npwpNumber, setNpwpNumber] = useState(settings.npwp_number);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [pagiStart, setPagiStart] = useState(settings.shift_pagi_start);
  const [pagiEnd, setPagiEnd] = useState(settings.shift_pagi_end);
  const [siangStart, setSiangStart] = useState(settings.shift_siang_start);
  const [siangEnd, setSiangEnd] = useState(settings.shift_siang_end);
  const [preventOversell, setPreventOversell] = useState(settings.prevent_oversell);
  const [thresholdUsd, setThresholdUsd] = useState(settings.transaction_threshold_usd);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCompanyName(settings.company_name);
    setCompanyAddress(settings.company_address);
    setCompanyPhone(settings.company_phone);
    setLicensePva(settings.license_pva);
    setNpwpNumber(settings.npwp_number);
    setLogoUrl(settings.logo_url || "");
    setPagiStart(settings.shift_pagi_start);
    setPagiEnd(settings.shift_pagi_end);
    setSiangStart(settings.shift_siang_start);
    setSiangEnd(settings.shift_siang_end);
    setPreventOversell(settings.prevent_oversell);
    setThresholdUsd(settings.transaction_threshold_usd);
  }, [settings]);

  useEffect(() => {
    if (!userLoading && !canEdit) {
      toast.error("Anda tidak memiliki akses ke Pengaturan");
      navigate({ to: "/dashboard" });
    }
  }, [userLoading, canEdit, navigate]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar. Maksimal 5 MB.");
      return;
    }

    // Check type
    if (!file.type.startsWith("image/")) {
      toast.error("Format file harus berupa gambar (PNG, JPG, SVG, WebP).");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // 1. Try uploading to Supabase Storage bucket
      const { error: uploadError } = await supabase.storage
        .from("company_assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("company_assets")
          .getPublicUrl(filePath);

        setLogoUrl(publicUrlData.publicUrl);
        toast.success("Logo berhasil diunggah ke storage");
      } else {
        // 2. Fallback: encode as base64 data URI directly into database
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setLogoUrl(base64);
          toast.success("Logo berhasil dimuat");
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error("Gagal mengunggah logo:", err);
      // Fallback to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setLogoUrl(base64);
        toast.success("Logo berhasil dimuat");
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Logo dihapus. Klik Simpan untuk memperbarui database.");
  };

  async function handleSave() {
    const name = companyName.trim();
    if (!name) {
      toast.error("Nama money changer tidak boleh kosong");
      return;
    }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("app_settings")
      .update({
        company_name: name,
        company_address: companyAddress.trim(),
        company_phone: companyPhone.trim(),
        license_pva: licensePva.trim(),
        npwp_number: npwpNumber.trim(),
        logo_url: logoUrl.trim() || null,
        shift_pagi_start: pagiStart,
        shift_pagi_end: pagiEnd,
        shift_siang_start: siangStart,
        shift_siang_end: siangEnd,
        prevent_oversell: preventOversell,
        transaction_threshold_usd: thresholdUsd,
        updated_at: new Date().toISOString(),
        updated_by: userRes.user?.id ?? null,
      })
      .eq("id", true);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }
    await refresh();
    toast.success("Pengaturan & Logo berhasil tersimpan di database");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">
            Konfigurasi identitas money changer & logo
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Identitas Money Changer</CardTitle>
          <CardDescription>
            Informasi dan logo ini akan ditampilkan pada sidebar, header, papan kurs TV, kwitansi, dan laporan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo Upload Section */}
          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Logo Money Changer</Label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Preview Box */}
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-2 overflow-hidden shadow-inner relative group">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo Preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground text-center">
                    <ImageIcon className="h-8 w-8 opacity-40 mb-1" />
                    <span className="text-[10px]">Belum ada logo</span>
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-xs">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {/* Action Buttons & Info */}
              <div className="flex flex-1 flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={loading || saving || uploadingLogo}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || saving || uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UploadCloud className="h-4 w-4" />
                    )}
                    {logoUrl ? "Ganti Logo" : "Unggah Logo"}
                  </Button>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleRemoveLogo}
                      disabled={loading || saving || uploadingLogo}
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Format yang didukung: PNG, JPG, SVG, WebP (Maksimal 5 MB). Disarankan logo berlatar belakang transparan.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-name">Nama Money Changer</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Contoh: PT Sinar Valuta Nusantara"
              disabled={loading || saving}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-address">Alamat</Label>
            <Input
              id="company-address"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="Jl Raya Uluwatu I 66 X Jimbaran, BALI"
              disabled={loading || saving}
              maxLength={160}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-phone">Telp/WA</Label>
              <Input
                id="company-phone"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="+62 812-4668-468"
                disabled={loading || saving}
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license-pva">Izin PVA</Label>
              <Input
                id="license-pva"
                value={licensePva}
                onChange={(e) => setLicensePva(e.target.value)}
                placeholder="23/34/KEP.GBI/Dpr/2021"
                disabled={loading || saving}
                maxLength={60}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="npwp-number">NPWP</Label>
            <Input
              id="npwp-number"
              value={npwpNumber}
              onChange={(e) => setNpwpNumber(e.target.value)}
              placeholder="01.446.521.5-904.000"
              disabled={loading || saving}
              maxLength={40}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving || loading || uploadingLogo} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Jam Shif Operasional (WITA)</CardTitle>
          <CardDescription>
            Default jam buka/tutup shif. Bersifat informatif — teller tetap bisa
            buka shif di luar jam ini bila diperlukan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Shif Pagi — Mulai</Label>
              <Input
                type="time"
                value={pagiStart}
                onChange={(e) => setPagiStart(e.target.value)}
                disabled={loading || saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Shif Pagi — Selesai</Label>
              <Input
                type="time"
                value={pagiEnd}
                onChange={(e) => setPagiEnd(e.target.value)}
                disabled={loading || saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Shif Siang — Mulai</Label>
              <Input
                type="time"
                value={siangStart}
                onChange={(e) => setSiangStart(e.target.value)}
                disabled={loading || saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Shif Siang — Selesai</Label>
              <Input
                type="time"
                value={siangEnd}
                onChange={(e) => setSiangEnd(e.target.value)}
                disabled={loading || saving}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan…" : "Simpan Jam Shif"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Keamanan & Validasi Transaksi
          </CardTitle>
          <CardDescription>
            Atur batasan dan validasi untuk operasional transaksi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="prevent-oversell" className="text-base font-medium">Cegah Penjualan Melebihi Saldo</Label>
              <p className="text-sm text-muted-foreground">
                Jika aktif, teller tidak bisa menjual valas jika saldo kas untuk mata uang tersebut tidak mencukupi.
              </p>
            </div>
            <Switch
              id="prevent-oversell"
              checked={preventOversell}
              onCheckedChange={setPreventOversell}
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="threshold-usd">Ambang Batas Transaksi Bulanan Nasabah (USD)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="threshold-usd"
                type="text"
                inputMode="numeric"
                value={thresholdUsd ? new Intl.NumberFormat("id-ID").format(thresholdUsd) : ""}
                onChange={(e) => setThresholdUsd(Number(e.target.value.replace(/[^\d]/g, "")))}
                placeholder="10000"
                disabled={loading || saving}
                className="max-w-[200px]"
              />
              <p className="text-sm text-muted-foreground">
                Maksimal akumulasi transaksi nasabah per bulan dalam ekuivalen USD.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan…" : "Simpan Pengaturan Keamanan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasAnyRole(roles, ["super_admin"]) && <ConnectionCard />}
    </div>
  );
}
function ConnectionCard() {
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [projectId, setProjectId] = useState(localStorage.getItem("override_supabase_project_id") || SUPABASE_PROJECT_ID);
  const [url, setUrl] = useState(localStorage.getItem("override_supabase_url") || SUPABASE_URL);
  const [anonKey, setAnonKey] = useState(localStorage.getItem("override_supabase_anon_key") || "");
  const [isUpdating, setIsUpdating] = useState(false);

  async function check() {
    setStatus("checking");
    setMessage("");
    try {
      const { error } = await supabase.from("branches").select("id").limit(1);
      if (error) {
        setStatus("error");
        setMessage(error.message);
      } else {
        setStatus("ok");
        setMessage("Koneksi ke database berhasil.");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Gagal menghubungkan ke database");
    }
  }

  useEffect(() => {
    void check();
  }, []);

  function handleSwitchProject() {
    if (!projectId || !url || !anonKey) {
      toast.error("Mohon isi Project ID, URL, dan Publishable Key");
      return;
    }

    setIsUpdating(true);
    try {
      localStorage.setItem("override_supabase_project_id", projectId);
      localStorage.setItem("override_supabase_url", url);
      localStorage.setItem("override_supabase_anon_key", anonKey);
      
      toast.success("Konfigurasi disimpan. Halaman akan dimuat ulang...");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      toast.error("Gagal menyimpan konfigurasi");
      setIsUpdating(false);
    }
  }

  function handleReset() {
    localStorage.removeItem("override_supabase_project_id");
    localStorage.removeItem("override_supabase_url");
    localStorage.removeItem("override_supabase_anon_key");
    toast.success("Konfigurasi direset ke default. Memuat ulang...");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  return (
    <Card className="max-w-2xl border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlugZap className="h-5 w-5 text-primary" />
          Konfigurasi & Koneksi Database
        </CardTitle>
        <CardDescription>
          Atur project database yang digunakan oleh aplikasi ini. (Role: Super Admin Only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="project-id">Project ID</Label>
            <Input
              id="project-id"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Misal: abcdefghijklmno"
              className="font-mono bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-url">Project URL</Label>
            <Input
              id="project-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://abcdefghijklmno.supabase.co"
              className="font-mono bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anon-key">Publishable (Anon) Key</Label>
            <Input
              id="anon-key"
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="sb_publishable_..."
              className="font-mono bg-background"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSwitchProject} disabled={isUpdating} className="flex-1">
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan & Hubungkan
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isUpdating}>
            Reset Default
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-sm">
            {status === "checking" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Memeriksa koneksi ke {url}...</span>
              </>
            )}
            {status === "ok" && (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-medium text-emerald-700">{message}</span>
              </>
            )}
            {status === "error" && (
              <>
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="break-all font-medium text-destructive">{message}</span>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={check} disabled={status === "checking"}>
            Uji Ulang
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
