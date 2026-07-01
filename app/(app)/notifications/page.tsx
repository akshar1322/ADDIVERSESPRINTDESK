import { Bell } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function NotificationsPage() {
  return (
    <ModulePlaceholder
      title="Notifications"
      description="Send operational updates over email, WhatsApp, and in-app channels."
      icon={Bell}
      capabilities={["New assignments", "Delivery reminders", "Priority updates", "Email via Resend", "WhatsApp API", "In-app inbox"]}
    />
  );
}
