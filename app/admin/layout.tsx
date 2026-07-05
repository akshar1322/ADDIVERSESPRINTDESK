import { redirect } from "next/navigation";

import { AppTopbar } from "@/components/layout/app-topbar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Footer } from "@/components/layout/footer";
import { requireSession } from "@/lib/session";
import { canAccessAdminPortal, getRole } from "@/server/authz";

type AppUser = {
  name?: string | null;
  email: string;
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();

  if (!canAccessAdminPortal(session)) {
    redirect("/work");
  }

  const user = session.user as AppUser;
  const role = getRole(session);
  const adminRole = role === "MASTER_ADMIN" ? "MASTER_ADMIN" : "SUB_ADMIN";

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar role={adminRole} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar user={{ name: user.name, email: user.email }} />
        {children}
        <Footer />
      </div>
    </div>
  );
}
