import { DashboardHeader } from '@/components/dashboard/header';
import { WorkflowList } from '@/components/workflows/workflow-list';

export default function WorkflowsPage() {
  return <><DashboardHeader /><main className="mx-auto max-w-7xl px-6 py-8"><WorkflowList /></main></>;
}
