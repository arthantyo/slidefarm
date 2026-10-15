import { DashboardShell } from '@/components/dashboard/shell';
import { WorkflowList } from '@/components/workflows/workflow-list';

export default function WorkflowsPage() {
  return <DashboardShell><main className="mx-auto max-w-7xl px-6 py-8"><WorkflowList /></main></DashboardShell>;
}
