import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, PlugZap, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_PROJECT_ID, SUPABASE_URL } from "@/integrations/supabase/config";
import { useCurrentUser, hasAnyRole } from "@/hooks/use-current-user";
import { useAppSettings } from "@/hooks/use-app-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { roles, loading: userLoading } = useCurrentUser();
  const canEdit = hasAnyRole(roles, ["super_admin", "owner"]);
  const { settings, refresh, loading } = useAppSettings();
  const [companyName, setCompanyName] = useState(settings.company_name);
  const [pagiStart, setPagiStart] = useState(settings.shift_pagi_start);
  const [pagiEnd, setPagiEnd] = useState(settings.shift_pagi_end);
  const [siangStart, setSiangStart] = useState(settings.shift_siang_start);
  const [siangEnd, setSiangEnd] = useState(settings.shift_siang_end);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCompanyName(settings.company_name);
    setPagiStart(settings.shift_pagi_start);
    setPagiEnd(settings.shift_pagi_end);
    setSiangStart(settings.shift_siang_start);
    setSiangEnd(settings.shift_siang_end);
  }, [settings]);

  useEffect(() => {
    if (!userLoading && !canEdit) {
      toast.error("Anda tidak memiliki akses ke Pengaturan");
      navigate({ to: "/dashboard" });
    }
  }, [userLoading, canEdit, navigate]);

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
        shift_pagi_start: pagiStart,
        shift_pagi_end: pagiEnd,
        shift_siang_start: siangStart,
        shift_siang_end: siangEnd,
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
    toast.success("Pengaturan tersimpan");
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
            Konfigurasi identitas money changer
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Identitas Money Changer</CardTitle>
          <CardDescription>
            Nama ini akan ditampilkan pada sidebar, header, kwitansi, dan laporan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
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

      {hasAnyRole(roles, ["super_admin"]) && <ConnectionCard />}
    </div>
  );
}