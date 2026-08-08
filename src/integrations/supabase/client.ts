import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config";

// Allow dynamic overrides for switching projects during runtime
const isBrowser = typeof window !== "undefined";
const overrideUrl = isBrowser ? localStorage.getItem("override_supabase_url") : null;
const overrideKey = isBrowser ? localStorage.getItem("override_supabase_anon_key") : null;

export const supabase = createClient(
  overrideUrl || SUPABASE_URL, 
  overrideKey || SUPABASE_PUBLISHABLE_KEY, 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: isBrowser ? window.localStorage : undefined,
    },
  }
);

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