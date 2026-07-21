import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Bell,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MasterPageHeader } from "@/components/master-data/page-header";
import {
  useNotifications,
  type NotificationCategory,
  type NotificationRow,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifikasi - KUPVA BB" },
      { name: "description", content: "Pusat notifikasi ambang batas dan peringatan sistem." },
    ],
  }),
});

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  ltkt_threshold: "LTKT / Nilai Besar",
  ltkm_suspicious: "LTKM Mencurigakan",
  blacklist_attempt: "Blacklist",
  low_cash: "Saldo Kas",
  approval_request: "Permintaan Persetujuan",
  approval_decision: "Keputusan Persetujuan",
  system: "Sistem",
};

function severityBadge(sev: NotificationRow["severity"]) {
  if (sev === "critical")
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" /> Kritis
      </Badge>
    );
  if (sev === "warning")
    return (
      <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500/90">
        <AlertTriangle className="h-3 w-3" /> Peringatan
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      <Info className="h-3 w-3" /> Info
    </Badge>
  );
}

function NotificationsPage() {
  const navigate = useNavigate();
  const { items, unread, userId, markRead, markAllRead } = useNotifications(200);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [category, setCategory] = useState<string>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (tab === "unread" && userId && (n.read_by ?? []).includes(userId))
        return false;
      if (category !== "all" && n.category !== category) return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          n.title.toLowerCase().includes(s) ||
          n.message.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [items, tab, category, q, userId]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      unread: unread.length,
      critical: items.filter((n) => n.severity === "critical").length,
      today: items.filter((n) => {
        const d = new Date(n.created_at);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      }).length,
    };
  }, [items, unread]);

  const handleOpen = async (n: NotificationRow) => {
    if (userId && !(n.read_by ?? []).includes(userId)) await markRead(n.id);
    if (n.link) navigate({ to: n.link });
  };

  return (
    <div className="space-y-6">
      <MasterPageHeader
        icon={Bell}
        title="Notifikasi"
        description="Peringatan ambang batas, LTKT/LTKM, saldo kas, dan alur persetujuan."
        action={
          <Button
            variant="outline"
            onClick={() => markAllRead()}
            disabled={unread.length === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Tandai semua dibaca
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: stats.total },
          { label: "Belum dibaca", value: stats.unread },
          { label: "Kritis", value: stats.critical },
          { label: "Hari ini", value: stats.today },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
              <TabsList>
                <TabsTrigger value="all">Semua</TabsTrigger>
                <TabsTrigger value="unread">
                  Belum dibaca {unread.length > 0 && `(${unread.length})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Cari notifikasi..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="sm:w-64"
              />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
              Tidak ada notifikasi.
            </div>
          ) : (
            <ul className="divide-y rounded-lg border">
              {filtered.map((n) => {
                const isUnread = userId ? !(n.read_by ?? []).includes(userId) : false;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4",
                      isUnread && "bg-primary/5",
                    )}
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {severityBadge(n.severity)}
                        <Badge variant="outline">
                          {CATEGORY_LABEL[n.category]}
                        </Badge>
                        {isUnread && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            BARU
                          </span>
                        )}
                      </div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-sm text-muted-foreground">{n.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(n.created_at), "dd MMM yyyy HH:mm", {
                          locale: idLocale,
                        })}
                        {" • "}
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: idLocale,
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markRead(n.id)}
                        >
                          <CheckCheck className="mr-1 h-3.5 w-3.5" />
                          Tandai
                        </Button>
                      )}
                      {n.link && (
                        <Button size="sm" onClick={() => handleOpen(n)}>
                          Buka
                          <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}