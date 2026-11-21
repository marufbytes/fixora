/** Client-safe role constants (no server imports). Re-exported by rbac.ts. */
export const ROLES = ["RESIDENT", "MANAGER", "TECHNICIAN", "OWNER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  RESIDENT: "Resident",
  MANAGER: "Manager",
  TECHNICIAN: "Technician",
  OWNER: "Owner",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
