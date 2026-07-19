import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const stats = [
  { label: "Transaksi Hari Ini", value: "128", delta: "+12.4%", up: true, icon: ClipboardList, hint: "vs kemarin" },
  { label: "Total Beli", value: idr(842_500_000), delta: "+8.1%", up: true, icon: ArrowDownRight, hint: "Valas masuk" },
  { label: "Total Jual", value: idr(915_200_000), delta: "+5.6%", up: true, icon: ArrowUpRight, hint: "Valas keluar" },
  { label: "Profit Harian", value: idr(28_450_000), delta: "-1.8%", up: false, icon: TrendingUp, hint: "Margin bersih" },
];

const trendData = [
  { d: "Sen", buy: 620, sell: 720 },
  { d: "Sel", buy: 700, sell: 760 },
  { d: "Rab", buy: 800, sell: 810 },
  { d: "Kam", buy: 750, sell: 830 },
  { d: "Jum", buy: 890, sell: 920 },
  { d: "Sab", buy: 940, sell: 970 },
  { d: "Min", buy: 842, sell: 915 },
];

const currencyMix = [
  { name: "USD", value: 45 },
  { name: "SGD", value: 18 },
  { name: "EUR", value: 14 },
  { name: "JPY", value: 9 },
  { name: "AUD", value: 8 },
  { name: "Lainnya", value: 6 },
];
const pieColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

const rates = [
  { code: "USD", buy: 16_120, sell: 16_180 },
  { code: "SGD", buy: 11_950, sell: 12_020 },
  { code: "EUR", buy: 17_420, sell: 17_500 },
  { code: "JPY", buy: 104, sell: 106 },
  { code: "AUD", buy: 10_480, sell: 10_540 },
  { code: "MYR", buy: 3_640, sell: 3_695 },
];

const recent = [
  { no: "TRX-24081", cust: "Andi Wijaya", type: "Beli", ccy: "USD", amount: 2500, total: 40_300_000, status: "Selesai" },
  { no: "TRX-24080", cust: "Sari Lestari", type: "Jual", ccy: "SGD", amount: 1200, total: 14_420_000, status: "Menunggu" },
  { no: "TRX-24079", cust: "PT Mitra Jaya", type: "Beli", ccy: "EUR", amount: 5000, total: 87_100_000, status: "Perlu Persetujuan" },
  { no: "TRX-24078", cust: "Budi Santoso", type: "Jual", ccy: "JPY", amount: 250_000, total: 26_500_000, status: "Selesai" },
  { no: "TRX-24077", cust: "Rina Amelia", type: "Beli", ccy: "AUD", amount: 800, total: 8_384_000, status: "Selesai" },
];

function statusVariant(s: string): "default" | "secondary" | "outline" | "destructive" {
  if (s === "Selesai") return "secondary";
  if (s === "Perlu Persetujuan") return "destructive";
  return "outline";
}

const monthly = [
  { m: "Jan", v: 320 }, { m: "Feb", v: 285 }, { m: "Mar", v: 410 },
  { m: "Apr", v: 380 }, { m: "Mei", v: 445 }, { m: "Jun", v: 520 },
  { m: "Jul", v: 490 }, { m: "Agu", v: 560 }, { m: "Sep", v: 610 },
  { m: "Okt", v: 585 }, { m: "Nov", v: 640 }, { m: "Des", v: 710 },
];

function DashboardPage() {
  void Users;
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan operasional money changer hari ini.
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs sm:flex">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Kas dibuka · Cabang Pusat
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <Badge variant={s.up ? "secondary" : "destructive"} className="gap-1">
                  {s.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {s.delta}
                </Badge>
              </div>
              <div className="mt-4 text-2xl font-extrabold tracking-tight">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label} · {s.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tren Transaksi 7 Hari</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pl-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gBuy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSell" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${v}jt`} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `Rp ${v} juta`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="buy" name="Beli" stroke="var(--chart-1)" fill="url(#gBuy)" strokeWidth={2} />
                <Area type="monotone" dataKey="sell" name="Jual" stroke="var(--chart-2)" fill="url(#gSell)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribusi Mata Uang</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={currencyMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {currencyMix.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Kurs Hari Ini</CardTitle>
            <span className="text-xs text-muted-foreground">Diperbarui 09:15 WIB</span>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mata Uang</TableHead>
                    <TableHead className="text-right">Beli (Rp)</TableHead>
                    <TableHead className="text-right">Jual (Rp)</TableHead>
                    <TableHead className="text-right">Spread</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((r) => (
                    <TableRow key={r.code}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {r.code.slice(0, 2)}
                          </div>
                          <span className="font-semibold">{r.code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{r.buy.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{r.sell.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{(r.sell - r.buy).toLocaleString("id-ID")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Posisi Kas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Saldo Kas IDR</div>
                <div className="mt-1 text-xl font-extrabold">{idr(1_248_500_000)}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { c: "USD", v: "$ 42.1k" },
                  { c: "SGD", v: "S$ 18.9k" },
                  { c: "EUR", v: "€ 12.3k" },
                ].map((x) => (
                  <div key={x.c} className="rounded-lg bg-primary/5 p-2">
                    <Wallet className="mx-auto mb-1 h-4 w-4 text-primary" />
                    {x.c}
                    <div className="font-semibold text-foreground">{x.v}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Perlu Perhatian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">3 transaksi menunggu approval</div>
                  <div className="text-xs text-muted-foreground">Transaksi &gt; Rp 100 juta</div>
                </div>
                <Badge variant="destructive">3</Badge>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">Stok JPY hampir habis</div>
                  <div className="text-xs text-muted-foreground">Sisa 15% dari batas minimum</div>
                </div>
                <Badge className="bg-warning text-warning-foreground hover:bg-warning">Rendah</Badge>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">1 nasabah High Risk</div>
                  <div className="text-xs text-muted-foreground">Perlu review CDD</div>
                </div>
                <Badge variant="outline">Review</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
          <span className="text-xs text-muted-foreground">5 dari 128 hari ini</span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Nasabah</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Mata Uang</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-right">Total (Rp)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.no}>
                    <TableCell className="font-mono text-xs">{r.no}</TableCell>
                    <TableCell className="font-medium">{r.cust}</TableCell>
                    <TableCell>
                      <Badge variant={r.type === "Beli" ? "secondary" : "outline"}>{r.type}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{r.ccy}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{r.amount.toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{idr(r.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendapatan Bulanan</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${v}jt`} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `Rp ${v} juta`} />
              <Bar dataKey="v" name="Pendapatan" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}