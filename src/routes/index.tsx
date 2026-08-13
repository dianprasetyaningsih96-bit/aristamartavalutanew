import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Banknote, LineChart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)]">
            <Banknote className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">'''Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.'''
                                        
                                            
                                            beritahu saya di file koding yang mana saja yg anda ubah</span>
        </div>
        <div className="flex items-center gap-4">
          <Button asChild size="sm">
            <Link to="/auth">
              Masuk <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Sistem Informasi{" "}
            <span className="bg-[image:var(--gradient-glow)] bg-clip-text text-transparent">
              Money Changer
            </span>{" "}
            '''Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.'''
                                        
                                            
                                            beritahu saya di file koding yang mana saja yg anda ubah
          </h1>
          <p className="mt-4 text-pretty text-base text-muted-foreground sm:mt-6 sm:text-lg">
            Platform terintegrasi untuk KYC/CDD, transaksi jual-beli valuta asing,
            manajemen kas, inventaris mata uang, dan pelaporan sesuai regulasi
            APU-PPT Bank Indonesia.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-8">
            <Button asChild size="lg">
              <Link to="/auth">
                Masuk ke Sistem <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:mt-20 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "KYC & CDD Terpadu", desc: "Verifikasi identitas dan uji tuntas nasabah otomatis." },
            { icon: Banknote, title: "Manajemen Kas & Inventaris", desc: "Pantau saldo kas dan stok mata uang real-time." },
            { icon: LineChart, title: "Pelaporan Regulator", desc: "Laporan harian, bulanan, dan audit trail lengkap." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6 sm:py-6">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Enkripsi & audit trail sesuai standar BI
          </span>
          <span>&copy; {new Date().getFullYear()} '''Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.'''
                                        
                                            
                                            beritahu saya di file koding yang mana saja yg anda ubah</span>
        </div>
      </footer>
    </div>
  );
}