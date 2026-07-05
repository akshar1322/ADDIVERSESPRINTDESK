import { ReceiptText } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function DeliveriesPage() {
  return (
    <ModulePlaceholder
      title="Deliveries"
      description="Review dispatched work, addresses, notes, and delivery history."
      icon={ReceiptText}
      capabilities={["Ready queue", "Dispatch history", "Delivery notes", "Addresses", "WhatsApp handoff", "Archive view"]}
    />
  );
}
