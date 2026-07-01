import { Boxes } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";
import { ProjectDeletePanel } from "@/components/projects/project-delete-panel";

export default function ProjectsPage() {
  return (
    <div>
      <ModulePlaceholder
        title="Project management"
        description="Plan, assign, prioritize, track, soft delete, and schedule deletion."
        icon={Boxes}
        capabilities={["Project CRUD", "Soft delete", "Scheduled delete", "Assignments", "Quantity tracking", "Audit logs"]}
      />
      <section className="-mt-2 px-4 pb-6 md:px-6">
        <ProjectDeletePanel />
      </section>
    </div>
  );
}
