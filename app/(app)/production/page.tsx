import { Timer } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function ProductionPage() {
  return (
    <ModulePlaceholder
      title="Production"
      description="Start, pause, resume, finish, and audit every print run."
      icon={Timer}
      capabilities={["Start timestamp", "Pause and resume", "Print timer", "Finish workflow", "Quantity updates", "Production history"]}
    />
  );
}
