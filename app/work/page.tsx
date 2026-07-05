import { EmployeePortal } from "@/components/work/employee-portal";
import { getEmployeeWorkspaceState } from "@/server/employee-workspace";

export default async function WorkPage() {
  const state = await getEmployeeWorkspaceState();

  return <EmployeePortal {...state} />;
}
