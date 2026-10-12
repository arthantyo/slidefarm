import { WorkflowBuilder } from '@/components/workflows/workflow-builder';

export default function EditWorkflowPage({ params }: { params: { id: string } }) {
  return <WorkflowBuilder workflowId={params.id} />;
}
