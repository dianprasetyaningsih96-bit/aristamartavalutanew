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
  branch_id?: string | null;
  type?: string | null;
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
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Get current user's profile and roles in parallel
      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, branch_id")
          .eq("id", uid)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);

      const roles = (roleRows ?? []).map((r) => r.role as string);
      const isSuperAdmin = roles.includes("super_admin") || roles.includes("owner");
      const userBranchId = profile?.branch_id ?? null;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error loading notifications:", error);
        setLoading(false);
        return;
      }

      let notifs = (data as unknown as NotificationRow[]) ?? [];

      // Filter on client-side for non-super_admins
      if (!isSuperAdmin && notifs.length > 0) {
        notifs = notifs.filter((n) => {
          if (n.user_id && n.user_id === uid) return true;
          const matchesRole =
            !n.target_roles ||
            n.target_roles.length === 0 ||
            n.target_roles.some((r) => roles.includes(r));
          const matchesBranch =
            !n.branch_id || !userBranchId || n.branch_id === userBranchId;
          return matchesRole && matchesBranch;
        });
      }

      setItems(notifs);
    } catch (err) {
      console.error("Unexpected error in useNotifications:", err);
    } finally {
      setLoading(false);
    }
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

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;

      // Optimistic local state update
      setItems((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                read_by: Array.from(new Set([...(n.read_by ?? []), userId])),
              }
            : n,
        ),
      );

      const { error } = await supabase.rpc("mark_notification_read", { _id: id });
      if (error) {
        const item = items.find((n) => n.id === id);
        const readBy = Array.from(new Set([...(item?.read_by ?? []), userId]));
        await supabase
          .from("notifications")
          .update({ read_by: readBy })
          .eq("id", id);
      }
      load();
    },
    [userId, items, load],
  );

  const markAllRead = useCallback(async () => {
    if (!userId || items.length === 0) return;

    // Optimistic local state update
    setItems((prev) =>
      prev.map((n) => ({
        ...n,
        read_by: Array.from(new Set([...(n.read_by ?? []), userId])),
      })),
    );

    const { error } = await supabase.rpc("mark_all_notifications_read");
    if (error) {
      const unreadList = items.filter((n) => !(n.read_by ?? []).includes(userId));
      await Promise.all(
        unreadList.map((n) =>
          supabase
            .from("notifications")
            .update({
              read_by: Array.from(new Set([...(n.read_by ?? []), userId])),
            })
            .eq("id", n.id),
        ),
      );
    }
    load();
  }, [userId, items, load]);

  return { items, unread, loading, userId, markRead, markAllRead, refresh: load };
}