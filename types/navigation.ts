import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Array<"MASTER_ADMIN" | "SUB_ADMIN" | "EMPLOYEE">;
};
