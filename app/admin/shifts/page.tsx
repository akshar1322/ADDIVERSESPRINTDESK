import { Timer } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function ShiftsPage() {
  return (
    <ModulePlaceholder
      title="Shifts"
      description="Define day, night, and custom shift windows for employee work sessions."
      icon={Timer}
      capabilities={["Shift definitions", "Active windows", "Custom schedules", "Handover rules", "Session tracking", "Audit links"]}
    />
  );
}
