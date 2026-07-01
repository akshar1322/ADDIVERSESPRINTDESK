import { Users } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function UsersPage() {
  return (
    <ModulePlaceholder
      title="User management"
      description="Create sub admins, employees, and customers with role-based access."
      icon={Users}
      capabilities={["Role permissions", "Invitations", "Employee profiles", "Soft delete", "Audit trail", "Status controls"]}
    />
  );
}
