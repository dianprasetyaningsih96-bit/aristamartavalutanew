import { createClient } from "@supabase/supabase-js";

// Publishable key — safe to expose in client bundle.
const SUPABASE_URL = "https://vbmdlqwplfomtzrhafrc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WVOw5REqyFAYq07Az1lkSQ_Hkevu_id";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export type AppRole =
  | "super_admin"
  | "branch_manager"
  | "teller"
  | "auditor"
  | "owner";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Administrator",
  branch_manager: "Branch Manager",
  teller: "Teller",
  auditor: "Auditor",
  owner: "Owner / Direktur",
};