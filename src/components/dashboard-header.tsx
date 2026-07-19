import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Search, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export function DashboardHeader({ trigger }: { trigger: ReactNode }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setEmail(u.email ?? "");
        setName((u.user_metadata?.full_name as string) ?? u.email ?? "Pengguna");
      }
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Anda telah keluar");
    navigate({ to: "/auth", replace: true });
  }

  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-md sm:px-6">
      {trigger}
      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari nasabah, transaksi..." className="pl-9" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge
            className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]"
            variant="destructive"
          >
            3
          </Badge>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-muted">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <div className="text-xs font-semibold leading-tight">{name}</div>
                <div className="text-[10px] text-muted-foreground">{email}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" /> Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}