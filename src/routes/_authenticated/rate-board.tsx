import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Clock,
  Building2,
  Tv,
  PhoneCall,
  Sparkles,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrencyInfo } from "@/lib/currency-flags";
import { useAppSettings } from "@/hooks/use-app-settings";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/rate-board")({
  component: RateBoardPage,
  head: () => ({
    meta: [
      { title: "Papan Kurs (TV Display) - Valuta Guardian" },
      {
        name: "description",
        content: "Tampilan layar penuh 16:9 papan kurs valuta asing real-time.",
      },
    ],
  }),
});

interface CurrencyItem {
  id: string;
  code: string;
  name: string;
  country: string | null;
  symbol: string | null;
  decimals: number;
}

interface RateItem {
  id: string;
  currency_id: string;
  branch_id: string | null;
  buy_rate: number;
  sell_rate: number;
  effective_date: string;
  is_active: boolean;
  currencies?: { code: string; name: string } | null;
  branches?: { code: string; name: string } | null;
}

interface BranchItem {
  id: string;
  code: string;
  name: string;
}

const ALL_HQ = "__all_hq__";

export function RateBoardPage() {
  const { settings } = useAppSettings();
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [rates, setRates] = useState<RateItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    return localStorage.getItem("rate_board_branch") || ALL_HQ;
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchFilter, setSearchFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for fullscreen change events
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Load currencies, branches, and active rates
  async function loadData() {
    try {
      const [{ data: curData }, { data: branchData }, { data: rateData }] =
        await Promise.all([
          supabase
            .from("currencies")
            .select("id, code, name, country, symbol, decimals")
            .eq("is_active", true)
            .order("code"),
          supabase
            .from("branches")
            .select("id, code, name")
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("exchange_rates")
            .select("*, currencies(code, name), branches(code, name)")
            .eq("is_active", true)
            .order("effective_date", { ascending: false }),
        ]);

      if (curData) setCurrencies(curData as CurrencyItem[]);
      if (branchData) setBranches(branchData as BranchItem[]);
      if (rateData) setRates(rateData as RateItem[]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Gagal memuat data papan kurs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // Supabase Real-time updates subscription
    const channel = supabase
      .channel(`rate-board-realtime-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exchange_rates" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "currencies" },
        () => loadData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Save selected branch in localStorage
  const handleBranchChange = (val: string) => {
    setSelectedBranch(val);
    localStorage.setItem("rate_board_branch", val);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          await containerRef.current.requestFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen toggle error:", err);
    }
  };

  // Build resolved rate list for each currency
  const displayRates = useMemo(() => {
    if (currencies.length === 0) return [];

    // Filter out IDR base currency if present
    const foreignCurrencies = currencies.filter(
      (c) => c.code.toUpperCase() !== "IDR",
    );

    const list = foreignCurrencies.map((cur) => {
      // Find branch specific rate or fallback to HQ/general rate
      let curRate: RateItem | undefined;

      if (selectedBranch !== ALL_HQ) {
        curRate = rates.find(
          (r) => r.currency_id === cur.id && r.branch_id === selectedBranch,
        );
      }

      // If not found or selected is HQ, find rate with null branch_id or newest rate
      if (!curRate) {
        curRate = rates.find(
          (r) => r.currency_id === cur.id && r.branch_id === null,
        );
      }

      // If still not found, take the latest rate for this currency
      if (!curRate) {
        curRate = rates.find((r) => r.currency_id === cur.id);
      }

      const buyRate = curRate ? Number(curRate.buy_rate) : 0;
      const sellRate = curRate ? Number(curRate.sell_rate) : 0;
      const meta = getCurrencyInfo(cur.code, cur.name);

      return {
        id: cur.id,
        code: cur.code,
        name: cur.name,
        countryName: cur.country || meta.countryName,
        currencyName: meta.currencyName,
        flagUrl: meta.flagUrl,
        emoji: meta.emoji,
        buyRate,
        sellRate,
        decimals: cur.decimals ?? 2,
        hasRate: Boolean(curRate),
      };
    });

    // Optional search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return list.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.countryName.toLowerCase().includes(q),
      );
    }

    return list;
  }, [currencies, rates, selectedBranch, searchFilter]);

  // Split items into 2 columns for 16:9 TV layout
  const midIndex = Math.ceil(displayRates.length / 2);
  const leftColumnRates = displayRates.slice(0, midIndex);
  const rightColumnRates = displayRates.slice(midIndex);

  const selectedBranchName = useMemo(() => {
    if (selectedBranch === ALL_HQ) return "KANTOR PUSAT & SEMUA CABANG";
    const b = branches.find((br) => br.id === selectedBranch);
    return b ? `${b.code} — ${b.name.toUpperCase()}` : "KANTOR PUSAT";
  }, [selectedBranch, branches]);

  const formatRate = (rate: number, decimals: number) => {
    if (!rate || rate === 0) return "-";
    // For IDR exchange rates (typically >= 100), format with id-ID locale
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: rate % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 4,
    }).format(rate);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar when not in fullscreen */}
      {!isFullscreen && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Papan Kurs Valuta Asing (TV Display)
              </h1>
              <p className="text-xs text-muted-foreground">
                Tampilan rasio 16:9 real-time untuk layar lobby / display TV kantor.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-48 sm:w-56">
              <Select value={selectedBranch} onValueChange={handleBranchChange}>
                <SelectTrigger className="h-9 text-xs">
                  <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Pilih Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_HQ}>Kantor Pusat (HQ)</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="h-9 gap-1.5 text-xs"
              title="Muat ulang kurs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Perbarui
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={toggleFullscreen}
              className="h-9 gap-1.5 bg-blue-600 text-xs font-semibold text-white shadow hover:bg-blue-700"
            >
              <Maximize2 className="h-4 w-4" />
              Layar Penuh (16:9)
            </Button>
          </div>
        </div>
      )}

      {/* 16:9 TV Rate Board Container */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-black select-none ${
          isFullscreen
            ? "fixed inset-0 z-50 h-screen w-screen"
            : "aspect-video rounded-2xl border-4 border-slate-800 shadow-2xl min-h-[560px]"
        }`}
      >
        {/* Ambient Glow Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#051126] via-[#091b3a] to-[#040c1d] pointer-events-none" />

        {/* Board Header */}
        <header className="relative z-10 flex h-20 items-center justify-between border-b border-blue-900/60 bg-[#020b18]/90 px-6 backdrop-blur-md">
          {/* Logo & Main Title */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-400/80 bg-gradient-to-tr from-blue-900 via-blue-700 to-cyan-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] overflow-hidden">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.company_name}
                  className="h-full w-full object-contain p-0.5 bg-black/40"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-base font-black tracking-wider text-white">
                  VG
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
                  EXCHANGE RATES
                </h1>
                <Badge className="border-cyan-500/40 bg-cyan-950/80 text-[11px] font-bold text-cyan-300">
                  KUPVA BB
                </Badge>
              </div>
              <p className="text-[11px] font-semibold tracking-wider text-cyan-300/80 uppercase">
                {settings.company_name} • {selectedBranchName}
              </p>
            </div>
          </div>

          {/* Right Header: Clock & Quick Controls */}
          <div className="flex items-center gap-4">
            {/* Live Clock Display */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 text-xl md:text-2xl font-black tracking-widest text-cyan-400 font-mono drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                <Clock className="h-5 w-5 text-cyan-400 animate-pulse" />
                {format(currentTime, "HH:mm:ss")} <span className="text-xs text-cyan-200">WIB</span>
              </div>
              <div className="text-[11px] font-medium text-slate-300">
                {format(currentTime, "EEEE, dd MMMM yyyy", { locale: idLocale })}
              </div>
            </div>

            {/* Quick Fullscreen Button in TV mode */}
            <button
              onClick={toggleFullscreen}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-800/80 bg-blue-950/60 text-slate-300 transition-colors hover:bg-blue-900 hover:text-white"
              title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (16:9)"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </button>
          </div>
        </header>

        {/* Board Main Content (2-Column Split matching reference image) */}
        <main className="relative z-10 flex h-[calc(100%-8.5rem)] w-full gap-3 p-3">
          {/* Left Column Table */}
          <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-blue-900/50 bg-[#061633]/80 shadow-lg backdrop-blur-sm">
            {/* Column Header */}
            <div className="grid grid-cols-12 items-center bg-[#081f44] px-4 py-2.5 text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-blue-800/60">
              <div className="col-span-1 text-center">Country</div>
              <div className="col-span-2 text-center">Code</div>
              <div className="col-span-3 pl-2">Currency</div>
              <div className="col-span-3 text-right pr-4 text-cyan-300">We buy</div>
              <div className="col-span-3 text-right pr-4 text-emerald-300">We sell</div>
            </div>

            {/* Rows List */}
            <div className="flex-1 flex flex-col justify-evenly divide-y divide-blue-950/80 overflow-hidden">
              {leftColumnRates.map((r, idx) => (
                <div
                  key={r.id}
                  className={`grid grid-cols-12 items-center px-4 py-2 transition-colors ${
                    idx % 2 === 0
                      ? "bg-[#0b2758]/90 hover:bg-[#11387d]"
                      : "bg-[#081e46]/90 hover:bg-[#103373]"
                  }`}
                >
                  {/* Flag */}
                  <div className="col-span-1 flex items-center justify-center">
                    <img
                      src={r.flagUrl}
                      alt={r.code}
                      className="h-5 w-7.5 rounded object-cover shadow-sm ring-1 ring-white/20"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>

                  {/* Code */}
                  <div className="col-span-2 text-center font-black text-base md:text-lg tracking-wider text-white">
                    {r.code}
                  </div>

                  {/* Currency Name */}
                  <div className="col-span-3 pl-2 truncate text-xs md:text-sm font-medium text-cyan-100/90">
                    {r.currencyName}
                  </div>

                  {/* We Buy */}
                  <div className="col-span-3 text-right pr-4 font-mono font-bold text-sm md:text-base tracking-tight text-cyan-300">
                    {formatRate(r.buyRate, r.decimals)}
                  </div>

                  {/* We Sell */}
                  <div className="col-span-3 text-right pr-4 font-mono font-bold text-sm md:text-base tracking-tight text-white">
                    {formatRate(r.sellRate, r.decimals)}
                  </div>
                </div>
              ))}
              {leftColumnRates.length === 0 && (
                <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                  Tidak ada data kurs
                </div>
              )}
            </div>
          </div>

          {/* Right Column Table */}
          <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-blue-900/50 bg-[#061633]/80 shadow-lg backdrop-blur-sm">
            {/* Column Header */}
            <div className="grid grid-cols-12 items-center bg-[#081f44] px-4 py-2.5 text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-blue-800/60">
              <div className="col-span-1 text-center">Country</div>
              <div className="col-span-2 text-center">Code</div>
              <div className="col-span-3 pl-2">Currency</div>
              <div className="col-span-3 text-right pr-4 text-cyan-300">We buy</div>
              <div className="col-span-3 text-right pr-4 text-emerald-300">We sell</div>
            </div>

            {/* Rows List */}
            <div className="flex-1 flex flex-col justify-evenly divide-y divide-blue-950/80 overflow-hidden">
              {rightColumnRates.map((r, idx) => (
                <div
                  key={r.id}
                  className={`grid grid-cols-12 items-center px-4 py-2 transition-colors ${
                    idx % 2 === 0
                      ? "bg-[#0b2758]/90 hover:bg-[#11387d]"
                      : "bg-[#081e46]/90 hover:bg-[#103373]"
                  }`}
                >
                  {/* Flag */}
                  <div className="col-span-1 flex items-center justify-center">
                    <img
                      src={r.flagUrl}
                      alt={r.code}
                      className="h-5 w-7.5 rounded object-cover shadow-sm ring-1 ring-white/20"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>

                  {/* Code */}
                  <div className="col-span-2 text-center font-black text-base md:text-lg tracking-wider text-white">
                    {r.code}
                  </div>

                  {/* Currency Name */}
                  <div className="col-span-3 pl-2 truncate text-xs md:text-sm font-medium text-cyan-100/90">
                    {r.currencyName}
                  </div>

                  {/* We Buy */}
                  <div className="col-span-3 text-right pr-4 font-mono font-bold text-sm md:text-base tracking-tight text-cyan-300">
                    {formatRate(r.buyRate, r.decimals)}
                  </div>

                  {/* We Sell */}
                  <div className="col-span-3 text-right pr-4 font-mono font-bold text-sm md:text-base tracking-tight text-white">
                    {formatRate(r.sellRate, r.decimals)}
                  </div>
                </div>
              ))}
              {rightColumnRates.length === 0 && (
                <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                  Tidak ada data kurs
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Board Footer with Running Marquee & Hotline */}
        <footer className="relative z-10 flex h-14 items-center justify-between border-t border-blue-900/60 bg-[#020b18]/95 px-6">
          {/* Customer Support Phone */}
          <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-cyan-400 shrink-0">
            <PhoneCall className="h-4 w-4 text-cyan-400" />
            <span>☎ 021-555-0199 / WhatsApp CS</span>
          </div>

          {/* Marquee Ticker */}
          <div className="mx-6 flex-1 overflow-hidden">
            <div className="whitespace-nowrap text-xs md:text-sm font-semibold tracking-wide text-slate-300 animate-pulse">
              ★ KURS DAPAT BERUBAH SEWAKTU-WAKTU MENGIKUTI PERGERAKAN PASAR VALAS INTERNASIONAL • TRANSAKSI AMAN, RESMI BERIZIN BANK INDONESIA • TERIMA PENUKARAN MATA UANG UTAMA DUNIA ★
            </div>
          </div>

          {/* Live Sync Status */}
          <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span>LIVE SYNC</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
