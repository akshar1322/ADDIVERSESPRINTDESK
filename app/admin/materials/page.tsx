import { Package } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function MaterialsPage() {
  return (
    <ModulePlaceholder
      title="Materials"
      description="Track filament, resin, and material defaults used on jobs."
      icon={Package}
      capabilities={["Material catalog", "Units", "Active/inactive", "Usage history", "Default pricing", "Job links"]}
    />
  );
}
