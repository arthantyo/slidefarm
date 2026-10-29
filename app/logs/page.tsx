import { AiUsageSection } from '@/components/dashboard/ai-usage-section';
import { DashboardShell } from '@/components/dashboard/shell';

export default function LogsPage() {
  return <DashboardShell>
    <main className="mx-auto max-w-7xl px-6 py-8">
      <AiUsageSection />
    </main>
  </DashboardShell>;
}
