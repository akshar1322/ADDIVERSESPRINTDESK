import type { AuthSession } from "@/lib/auth";

type Role = "MASTER_ADMIN" | "SUB_ADMIN" | "EMPLOYEE";

export function getRole(session: AuthSession): Role {
  const role = session.user.role;

  if (role === "MASTER_ADMIN" || role === "SUB_ADMIN" || role === "EMPLOYEE") {
    return role;
  }

  return "EMPLOYEE";
}

export function canManageProjects(session: AuthSession) {
  const role = getRole(session);
  return role === "MASTER_ADMIN" || role === "SUB_ADMIN";
}

export function canManageStorage(session: AuthSession) {
  const role = getRole(session);
  return role === "MASTER_ADMIN" || role === "SUB_ADMIN";
}

export function canAccessAdminPortal(session: AuthSession) {
  const role = getRole(session);
  return role === "MASTER_ADMIN" || role === "SUB_ADMIN";
}

export function canManageUsers(session: AuthSession) {
  return canAccessAdminPortal(session);
}
