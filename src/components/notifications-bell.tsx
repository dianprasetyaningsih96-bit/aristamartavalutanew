import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type NotificationRow } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

function SeverityIcon({ severity }: { severity: NotificationRow["severity"] }) {
  if (severity === "critical")
    return <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />;
  if (severity === "warning")
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />;
  return <Info className="h-4 w-4 shrink-0 text-primary" />;
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { items, unread, userId, markRead, markAllRead, refresh } =
    useNotifications(20);

  const handleClick = async (n: NotificationRow) => {
    if (userId && !(n.read_by ?? []).includes(userId)) {
      await markRead(n.id);
    }
    setOpen(false);
    if (n.link) {
      navigate({ to: n.link });
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    toast.success("Semua notifikasi ditandai dibaca");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-muted"
          aria-label="Buka notifikasi"
        >
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-in zoom-in-50">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Pemberitahuan</div>
            <div className="text-xs text-muted-foreground">
              {unread.length > 0
                ? `${unread.length} belum dibaca`
                : "Semua sudah dibaca"}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Perbarui notifikasi"
              onClick={() => {
                refresh();
                toast.info("Memperbarui notifikasi...");
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {unread.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                Tandai semua
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[360px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 stroke-[1.5] mb-2 opacity-50" />
              <span>Belum ada notifikasi baru</span>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const isUnread = userId
                  ? !(n.read_by ?? []).includes(userId)
                  : false;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={cn(
                        "flex w-full gap-3 p-3.5 text-left transition-colors hover:bg-muted/60",
                        isUnread && "bg-primary/5 font-medium",
                      )}
                    >
                      <div className="mt-0.5">
                        <SeverityIcon severity={n.severity} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {n.title}
                          </div>
                          {isUnread && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="line-clamp-2 text-xs text-muted-foreground mt-0.5">
                          {n.message}
                        </div>
                        <div className="mt-1.5 text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                            locale: idLocale,
                          })}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/notifications" });
            }}
          >
            Lihat semua notifikasi
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}