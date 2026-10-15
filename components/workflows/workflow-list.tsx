'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Workflow } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowRight, Images, Plus, Trash2, Workflow as WorkflowIcon } from 'lucide-react';

export function WorkflowList() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/workflows', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Could not load workflows.');
      return response.json() as Promise<{ workflows: Workflow[] }>;
    }).then((result) => setWorkflows(result.workflows))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load workflows.'))
      .finally(() => setLoaded(true));
  }, []);

  const remove = async () => {
    if (!deleteId) return;
    const next = workflows.filter((item) => item.id !== deleteId);
    try {
      const response = await fetch('/api/workflows', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      if (!response.ok) throw new Error('Could not delete workflow.');
      setWorkflows(next);
      setDeleteId(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete workflow.'); }
  };

  return <>
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-bold">Workflows</h1><p className="mt-1 text-muted-foreground">Create and manage your content workflows.</p></div>
      <div className="flex gap-2"><Button asChild variant="outline"><Link href="/workflows/media"><Images className="mr-2 h-4 w-4" />Exports</Link></Button><Button asChild><Link href="/workflows/new"><Plus className="mr-2 h-4 w-4" />New workflow</Link></Button></div>
    </div>
    {error && <p role="alert" className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>}
    {loaded && workflows.length === 0 && !error && <div className="rounded-xl border border-dashed p-12 text-center"><WorkflowIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="font-semibold">No workflows yet</h2><p className="mt-1 text-sm text-muted-foreground">Build your first workflow to generate media from a template.</p><Button asChild className="mt-5"><Link href="/workflows/new"><Plus className="mr-2 h-4 w-4" />New workflow</Link></Button></div>}
    <div className="space-y-3">{[...workflows].sort((a, b) => b.updatedAt - a.updatedAt).map((item) => <Card key={item.id} className="flex items-center gap-4 p-4 hover:border-primary/50">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10"><WorkflowIcon className="h-5 w-5 text-primary" /></div>
      <Link href={`/workflows/${item.id}`} className="min-w-0 flex-1"><h2 className="truncate font-semibold">{item.name}</h2><p className="text-sm text-muted-foreground">{item.sourceType === 'ai' ? 'AI agent' : 'JSON source'} · {item.exportFormat.toUpperCase()} · Edited {new Date(item.updatedAt).toLocaleDateString()}</p></Link>
      <Button asChild variant="ghost" size="icon" aria-label={`Open ${item.name}`}><Link href={`/workflows/${item.id}`}><ArrowRight className="h-4 w-4" /></Link></Button>
      <Button variant="ghost" size="icon" aria-label={`Delete ${item.name}`} onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4" /></Button>
    </Card>)}</div>
    <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete workflow?</AlertDialogTitle><AlertDialogDescription>Existing media from this workflow will remain available.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void remove()}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
