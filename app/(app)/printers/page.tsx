import { Printer } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function PrintersPage() {
  return (
    <ModulePlaceholder
      title="Printer management"
      description="Monitor machine availability, maintenance state, active jobs, and assigned operators."
      icon={Printer}
      capabilities={["Machine inventory", "Availability status", "Current project", "Assigned employee", "Maintenance mode", "Utilization"]}
    />
  );
}
