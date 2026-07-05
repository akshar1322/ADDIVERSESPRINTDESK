"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { getAdminNavItemsForRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type AdminSidebarProps = {
  role: "MASTER_ADMIN" | "SUB_ADMIN";
};

export function AdminSidebar({ role }: AdminSidebarProps) {
  const navItems = getAdminNavItemsForRole(role);
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar px-4 py-5 text-sidebar-foreground lg:block">
      <div className="flex items-center gap-3 px-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          PF
        </div>
        <div>
          <p className="font-semibold leading-none">PrintFlow</p>
          <p className="mt-1 text-xs text-muted-foreground">Admin portal</p>
        </div>
      </div>
      <Badge variant="blue" className="mt-5">
        {role.replace("_", " ").toLowerCase()}
      </Badge>
      <nav className="mt-6 grid gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive &&
                  "bg-primary text-primary-foreground shadow-xs hover:bg-primary hover:text-primary-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
