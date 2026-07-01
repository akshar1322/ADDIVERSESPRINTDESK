import { Building2 } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function CustomersPage() {
  return (
    <ModulePlaceholder
      title="Customer management"
      description="Track customer contacts, delivery preferences, WhatsApp numbers, and project history."
      icon={Building2}
      capabilities={["Customer records", "Contact channels", "Project history", "Delivery addresses", "Notes", "Exports"]}
    />
  );
}
