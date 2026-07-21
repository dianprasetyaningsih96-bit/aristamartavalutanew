import { useNavigate } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
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
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (severity === "warning")
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-primary" />;
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const { items, unread, userId, markRead, markAllRead } = useNotifications(20);

  const handleClick = async (n: NotificationRow) => {
    if (userId && !(n.read_by ?? []).includes(userId)) {
      await markRead(n.id);
    }
    if (n.link) navigate({ to: n.link });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <Badge
              className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]"
              variant="destructive"
            >
              {unread.length > 9 ? "9+" : unread.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <div>
            <div className="text-sm font-semibold">Notifikasi</div>
            <div className="text-xs text-muted-foreground">
              {unread.length} belum dibaca
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead()}
            disabled={unread.length === 0}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Tandai semua
          </Button>
        </div>
        <ScrollArea className="h-[420px]">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Belum ada notifikasi
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const isUnread = userId ? !(n.read_by ?? []).includes(userId) : false;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={cn(
                        "flex w-full gap-3 p-3 text-left transition-colors hover:bg-muted/60",
                        isUnread && "bg-primary/5",
                      )}
                    >
                      <div className="mt-0.5">
                        <SeverityIcon severity={n.severity} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate text-sm font-medium">
                            {n.title}
                          </div>
                          {isUnread && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="line-clamp-2 text-xs text-muted-foreground">
                          {n.message}
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
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
            className="w-full"
            onClick={() => navigate({ to: "/notifications" })}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Lihat semua notifikasi
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}