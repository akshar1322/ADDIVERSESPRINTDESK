import { HardDriveUpload } from "lucide-react";

import { ModulePlaceholder } from "@/components/modules/module-placeholder";
import { StorageManagementPanel } from "@/components/storage/storage-management-panel";

export default function FilesPage() {
  return (
    <div>
      <ModulePlaceholder
        title="File manager"
        description="Upload production files, manage storage records, and schedule deletion."
        icon={HardDriveUpload}
        capabilities={["File-only uploads", "Storage keys", "Checksums", "Scheduled deletion", "Nightly cleanup", "Backup snapshots"]}
      />
      <section className="-mt-2 px-4 pb-6 md:px-6">
        <StorageManagementPanel />
      </section>
    </div>
  );
}
