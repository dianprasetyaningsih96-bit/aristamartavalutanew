import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config";

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