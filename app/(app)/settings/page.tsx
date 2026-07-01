import { Settings } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Settings"
      description="Configure organization defaults, notification preferences, storage, and security."
      icon={Settings}
      capabilities={["Organization profile", "Notification rules", "Storage provider", "Delivery defaults", "Audit retention", "Security controls"]}
    />
  );
}
