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
