import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Banknote, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("Gagal masuk", { description: error.message });
    toast.success("Berhasil masuk");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error("Gagal mendaftar", { description: error.message });
    toast.success("Akun dibuat", {
      description: "Silakan cek email untuk verifikasi.",
    });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-[image:var(--gradient-primary)] text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Banknote className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">KUPVA BB</span>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight">
            Kelola operasional money changer dengan aman dan patuh.
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            KYC/CDD, transaksi valas, manajemen kas, dan pelaporan sesuai
            regulasi APU-PPT Bank Indonesia — dalam satu platform.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            Enkripsi end-to-end · Audit trail lengkap
          </div>
        </div>
        <div className="text-xs text-primary-foreground/60">
          &copy; {new Date().getFullYear()} KUPVA BB — Money Changer Information System
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Banknote className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">KUPVA BB</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Selamat datang</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk ke sistem informasi money changer Anda.
          </p>

          <Tabs defaultValue="signin" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Masuk</TabsTrigger>
              <TabsTrigger value="signup">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.co.id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Masuk
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <Input
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Email</Label>
                  <Input
                    id="email2"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">Kata Sandi</Label>
                  <Input
                    id="password2"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Buat Akun
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}