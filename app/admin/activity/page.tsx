import { ListChecks } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function ActivityPage() {
  return (
    <ModulePlaceholder
      title="Activity"
      description="Review the audit trail of job, employee, and admin actions."
      icon={ListChecks}
      capabilities={["Actor identity", "Shift context", "Job history", "Server timestamps", "Search", "Export"]}
    />
  );
}
