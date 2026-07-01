import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Footer } from "@/components/layout/footer";
import { requireSession } from "@/lib/session";

type AppUser = {
  name?: string | null;
  email: string;
  role?: string | null;
};

function normalizeRole(role?: string | null): "MASTER_ADMIN" | "SUB_ADMIN" | "EMPLOYEE" {
  if (role === "MASTER_ADMIN" || role === "SUB_ADMIN" || role === "EMPLOYEE") {
    return role;
  }

  return "EMPLOYEE";
}

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const user = session.user as AppUser;
  const role = normalizeRole(user.role);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar user={{ name: user.name, email: user.email }} />
        {children}
        <Footer />
      </div>
    </div>
  );
}
