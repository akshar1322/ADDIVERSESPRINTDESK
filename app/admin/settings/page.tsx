import { Settings } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function AdminSettingsPage() {
  return (
    <ModulePlaceholder
      title="Settings"
      description="Configure defaults, storage, and security."
      icon={Settings}
      capabilities={["Organization profile", "Storage provider", "Security controls", "Delivery defaults", "Audit retention", "Notifications"]}
    />
  );
}
