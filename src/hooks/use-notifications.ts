import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationCategory =
  | "ltkt_threshold"
  | "ltkm_suspicious"
  | "blacklist_attempt"
  | "low_cash"
  | "approval_request"
  | "approval_decision"
  | "system";

export interface NotificationRow {
  id: string;
  user_id: string | null;
  target_roles: string[] | null;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link: string | null;
  reference_table: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  read_by: string[] | null;
  created_at: string;
}

export function useNotifications(limit = 50) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUserId(uid);
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Get current user's profile to check roles/branch
    const { data: profile } = await supabase
      .from("profiles")
      .select("branch_id, user_roles(role)")
      .eq("id", uid)
      .single();

    const roles = profile?.user_roles?.map((r: any) => r.role) || [];
    const isSuperAdmin = roles.includes("super_admin");

    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!isSuperAdmin) {
      // For non-super_admins, filter by:
      // 1. Direct user_id match
      // 2. OR: target_roles overlap AND (branch_id matches OR branch_id is null)
      query = query.or(`user_id.eq.${uid},and(target_roles.overlap.{${roles.join(",")}},or(branch_id.is.null,branch_id.eq.${profile?.branch_id}))`);
    }

    const { data } = await query;

    setItems((data as NotificationRow[]) ?? []);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`notifications-feed-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const unread = userId
    ? items.filter((n) => !(n.read_by ?? []).includes(userId))
    : [];

  const markRead = useCallback(async (id: string) => {
    await supabase.rpc("mark_notification_read", { _id: id });
    load();
  }, [load]);

  const markAllRead = useCallback(async () => {
    await supabase.rpc("mark_all_notifications_read");
    load();
  }, [load]);

  return { items, unread, loading, userId, markRead, markAllRead, refresh: load };
}