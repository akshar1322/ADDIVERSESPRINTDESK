import { Plus } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function NewJobPage() {
  return (
    <ModulePlaceholder
      title="New Job"
      description="Create a production job with files, quantity, delivery details, and admin instructions."
      icon={Plus}
      capabilities={["Client info", "Job info", "File upload", "Preview summary", "Creator tracking", "Initial NEW status"]}
    />
  );
}
