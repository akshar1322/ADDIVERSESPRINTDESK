import { Boxes } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";

type RouteProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobDetailPage({ params }: RouteProps) {
  const { jobId } = await params;

  return (
    <ModulePlaceholder
      title={`Job ${jobId}`}
      description="Detailed job view for history, files, activity, and workflow changes."
      icon={Boxes}
      capabilities={["Job timeline", "Files", "Production runs", "Progress updates", "Delivery record", "Activity trail"]}
    />
  );
}
