import { BarChart3 } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      title="Reports"
      description="Review monthly performance across projects, employees, printers, and customers."
      icon={BarChart3}
      capabilities={["Monthly reports", "Employee performance", "Printer utilization", "Customer summaries", "PDF export", "Excel export"]}
    />
  );
}
