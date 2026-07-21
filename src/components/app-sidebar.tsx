import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  Banknote,
  Coins,
  LineChart,
  Building2,
  FileText,
  ShieldCheck,
  Settings,
  ClipboardList,
  UserCog,
  Bell,
  Clock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { AppRole } from "@/integrations/supabase/client";
import { ROLE_LABELS } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSettings } from "@/hooks/use-app-settings";

// Prioritas peran untuk ditampilkan (tertinggi → terendah)
const ROLE_PRIORITY: AppRole[] = [
  "super_admin",
  "owner",
  "branch_manager",
  "auditor",
  "teller",
];

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[]; // roles allowed to see this item
};

const ALL: AppRole[] = [
  "super_admin",
  "branch_manager",
  "teller",
  "auditor",
  "owner",
];

const primary: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ALL },
  {
    title: "Transaksi",
    url: "/transactions",
    icon: ArrowLeftRight,
    roles: ["super_admin", "branch_manager", "teller", "owner"],
  },
  {
    title: "Nasabah",
    url: "/customers",
    icon: Users,
    roles: ["super_admin", "branch_manager", "teller", "auditor", "owner"],
  },
  {
    title: "Kas & Inventaris",
    url: "/cash",
    icon: Banknote,
    roles: ["super_admin", "branch_manager", "teller", "owner"],
  },
  {
    title: "Shif Kerja",
    url: "/shifts",
    icon: Clock,
    roles: ["super_admin", "branch_manager", "teller", "owner"],
  },
  {
    title: "Kurs Valuta",
    url: "/rates",
    icon: LineChart,
    roles: ["super_admin", "branch_manager", "owner"],
  },
  {
    title: "Mata Uang",
    url: "/currencies",
    icon: Coins,
    roles: ["super_admin", "owner"],
  },
];

const admin: NavItem[] = [
  {
    title: "Cabang",
    url: "/branches",
    icon: Building2,
    roles: ["super_admin", "owner"],
  },
  {
    title: "Laporan",
    url: "/reports",
    icon: FileText,
    roles: ["super_admin", "branch_manager", "auditor", "owner"],
  },
  {
    title: "Persetujuan",
    url: "/approvals",
    icon: ClipboardList,
    roles: ["super_admin", "branch_manager", "owner"],
  },
  {
    title: "Notifikasi",
    url: "/notifications",
    icon: Bell,
    roles: ALL,
  },
  {
    title: "Audit Trail",
    url: "/audit",
    icon: ShieldCheck,
    roles: ["super_admin", "auditor", "owner"],
  },
  {
    title: "Manajemen User",
    url: "/users",
    icon: UserCog,
    roles: ["super_admin", "owner"],
  },
  {
    title: "Pengaturan",
    url: "/settings",
    icon: Settings,
    roles: ["super_admin"],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (r) => r.location.pathname,
  });
  const isActive = (url: string) =>
    currentPath === url || currentPath.startsWith(url + "/");
  const { roles, loading } = useCurrentUser();
  const canSee = (item: NavItem) =>
    item.roles.some((r) => roles.includes(r));
  const visiblePrimary = primary.filter(canSee);
  const visibleAdmin = admin.filter(canSee);
  const displayRoles = ROLE_PRIORITY.filter((r) => roles.includes(r));
  const { settings } = useAppSettings();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-glow)] text-primary-foreground shadow-lg">
            <Banknote className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-sidebar-foreground">
                {settings.company_name}
              </div>
              <div className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                {loading
                  ? "Memuat…"
                  : displayRoles.length
                    ? displayRoles.map((r) => ROLE_LABELS[r]).join(" · ")
                    : "Belum ada peran"}
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {loading ? (
          <div className="space-y-2 px-2 py-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <>
          {visiblePrimary.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Operasional</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visiblePrimary.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          )}

          {visibleAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administrasi</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdmin.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          )}
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

// Suppress unused import when router links aren't wired to typed routes yet.
void Link;