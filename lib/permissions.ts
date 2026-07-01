import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Gauge,
  HardDriveUpload,
  Printer,
  Settings,
  Timer,
  Users,
} from "lucide-react";

import type { NavItem } from "@/types/navigation";

export const appNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Gauge, roles: ["MASTER_ADMIN", "SUB_ADMIN", "EMPLOYEE"] },
  { title: "Users", href: "/users", icon: Users, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Customers", href: "/customers", icon: Building2, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Projects", href: "/projects", icon: Boxes, roles: ["MASTER_ADMIN", "SUB_ADMIN", "EMPLOYEE"] },
  { title: "Files", href: "/files", icon: HardDriveUpload, roles: ["MASTER_ADMIN", "SUB_ADMIN", "EMPLOYEE"] },
  { title: "Printers", href: "/printers", icon: Printer, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Production", href: "/production", icon: Timer, roles: ["MASTER_ADMIN", "SUB_ADMIN", "EMPLOYEE"] },
  { title: "Notifications", href: "/notifications", icon: Bell, roles: ["MASTER_ADMIN", "SUB_ADMIN", "EMPLOYEE"] },
  { title: "Reports", href: "/reports", icon: BarChart3, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Settings", href: "/settings", icon: Settings, roles: ["MASTER_ADMIN"] },
];

export function getNavItemsForRole(role: "MASTER_ADMIN" | "SUB_ADMIN" | "EMPLOYEE") {
  return appNavItems.filter((item) => item.roles.includes(role));
}
