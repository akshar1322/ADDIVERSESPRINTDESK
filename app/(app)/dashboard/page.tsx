import { redirect } from "next/navigation";

import { requireSession } from "@/lib/session";
import { canAccessAdminPortal } from "@/server/authz";

export default async function DashboardPage() {
  const session = await requireSession();

  if (canAccessAdminPortal(session)) {
    redirect("/admin/dashboard");
  }

  redirect("/work");
}
