import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Gauge,
  HardDriveUpload,
  LayoutDashboard,
  ListChecks,
  Package,
  ReceiptText,
  SlidersHorizontal,
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
  if (role === "MASTER_ADMIN" || role === "SUB_ADMIN") {
    return adminNavItems.filter((item) => item.roles.includes(role));
  }

  return appNavItems.filter((item) => item.roles.includes(role));
}

export const adminNavItems: NavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Jobs", href: "/admin/jobs", icon: Boxes, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Clients", href: "/admin/clients", icon: Building2, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Employees", href: "/admin/employees", icon: Users, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Printers", href: "/admin/printers", icon: Printer, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Materials", href: "/admin/materials", icon: Package, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Shifts", href: "/admin/shifts", icon: Timer, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Deliveries", href: "/admin/deliveries", icon: ReceiptText, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Activity", href: "/admin/activity", icon: ListChecks, roles: ["MASTER_ADMIN", "SUB_ADMIN"] },
  { title: "Settings", href: "/admin/settings", icon: SlidersHorizontal, roles: ["MASTER_ADMIN"] },
];

export function getAdminNavItemsForRole(role: "MASTER_ADMIN" | "SUB_ADMIN") {
  return adminNavItems.filter((item) => item.roles.includes(role));
}
