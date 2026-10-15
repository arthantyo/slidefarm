'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { WorkflowMedia } from '@/types';
import { DashboardShell } from '@/components/dashboard/shell';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Folder, Workflow } from 'lucide-react';

export default function WorkflowMediaPage() {
  const [media, setMedia] = useState<WorkflowMedia[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [openWorkflowId, setOpenWorkflowId] = useState<string | null>(null);
  useEffect(() => {
    void fetch('/api/media', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Could not load media.');
      return response.json() as Promise<{ media: WorkflowMedia[] }>;
    }).then((result) => setMedia(result.media))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load media.'))
      .finally(() => setLoaded(true));
  }, []);
  const groups = Array.from(media.reduce((byWorkflow, item) => {
    const group = byWorkflow.get(item.workflowId);
    if (group) group.items.push(item);
    else byWorkflow.set(item.workflowId, { workflowId: item.workflowId, workflowName: item.workflowName, items: [item] });
    return byWorkflow;
  }, new Map<string, { workflowId: string; workflowName: string; items: WorkflowMedia[] }>()).values())
    .map((group) => ({ ...group, items: group.items.sort((a, b) => b.createdAt - a.createdAt) }))
    .sort((a, b) => b.items[0].createdAt - a.items[0].createdAt);
  const openGroup = groups.find((group) => group.workflowId === openWorkflowId);
  return <DashboardShell><main className="mx-auto max-w-7xl px-6 py-8">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-bold">{openGroup ? openGroup.workflowName : 'Workflow exports'}</h1><p className="mt-1 text-muted-foreground">{openGroup ? `${openGroup.items.length} ${openGroup.items.length === 1 ? 'export' : 'exports'}` : 'Exports created by your workflows.'}</p></div>
      <Button asChild variant="outline" className="gap-2"><Link href="/workflows"><Workflow className="h-4 w-4" /> Workflows</Link></Button>
    </div>
    {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
    {loaded && media.length === 0 && !error && <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">Run a workflow to create your first media export.</div>}
    {!openGroup && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{groups.map((group) => <button key={group.workflowId} type="button" onClick={() => setOpenWorkflowId(group.workflowId)} className="flex items-center gap-4 rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/60 hover:bg-accent"><span className="rounded-lg bg-primary/10 p-3 text-primary"><Folder className="h-6 w-6" /></span><span className="min-w-0"><span className="block truncate font-semibold">{group.workflowName}</span><span className="text-sm text-muted-foreground">{group.items.length} {group.items.length === 1 ? 'export' : 'exports'}</span></span></button>)}</div>}
    {openGroup && <section>
      <Button variant="ghost" className="mb-5 gap-2" onClick={() => setOpenWorkflowId(null)}><ArrowLeft className="h-4 w-4" /> All exports</Button>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {openGroup.items.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/media/${item.id}?preview=1`} alt={`Preview of ${item.projectName}`} className="aspect-[4/3] w-full bg-muted object-contain" />
        <div className="space-y-2 p-4">
          <h2 className="truncate font-semibold" title={item.projectName}>{item.projectName}</h2>
          <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {item.format.toUpperCase()}</p>
          <Button asChild variant="outline" size="sm" className="w-full gap-2"><a href={`/api/media/${item.id}`} download><Download className="h-4 w-4" /> Download</a></Button>
        </div>
      </article>)}
      </div>
    </section>}
  </main></DashboardShell>;
}

