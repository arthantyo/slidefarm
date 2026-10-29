"use client";

import { useCallback, useEffect, useState } from 'react';
import type { AiUsageEntry } from '@/lib/server/ai-usage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

export function AiUsageSection() {
  const [entries, setEntries] = useState<AiUsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/usage', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load AI usage.');
      const result = await response.json() as { entries: AiUsageEntry[] };
      setEntries(result.entries);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load AI usage.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const successful = entries.filter((entry) => entry.status === 'succeeded');
  const textRequests = successful.filter((entry) => entry.kind === 'text').length;
  const imageRequests = successful.filter((entry) => entry.kind === 'image').length;
  const tokens = successful.reduce((total, entry) => total + (entry.inputTokens ?? 0) + (entry.outputTokens ?? 0), 0);

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Logs</h1>
        <p className="text-sm text-muted-foreground">OpenAI requests made in SlideFarm. Token totals include requests where the provider returned usage data.</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading} className="gap-2">
        <RefreshCw className="h-4 w-4" /> Refresh
      </Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="p-4"><p className="text-sm text-muted-foreground">Text requests</p><p className="text-2xl font-semibold">{textRequests}</p></Card>
      <Card className="p-4"><p className="text-sm text-muted-foreground">Images generated</p><p className="text-2xl font-semibold">{imageRequests}</p></Card>
      <Card className="p-4"><p className="text-sm text-muted-foreground">Recorded tokens</p><p className="text-2xl font-semibold">{tokens.toLocaleString()}</p></Card>
    </div>
    {loading && entries.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Loading usage...</p>
      : entries.length === 0 ? <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">No AI requests recorded yet. New activity will appear here.</p>
      : <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground"><tr>
              <th className="px-4 py-3 font-medium">When</th><th className="px-4 py-3 font-medium">Action</th><th className="px-4 py-3 font-medium">Model</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Tokens</th>
            </tr></thead>
            <tbody>{entries.map((entry) => <tr key={entry.id} className="border-t">
              <td className="whitespace-nowrap px-4 py-3">{new Date(entry.timestamp).toLocaleString()}</td>
              <td className="whitespace-nowrap px-4 py-3">{entry.feature}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{entry.model}</td>
              <td className={`whitespace-nowrap px-4 py-3 ${entry.status === 'failed' ? 'text-destructive' : ''}`}>{entry.status === 'succeeded' ? 'Succeeded' : 'Failed'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">{entry.inputTokens !== undefined || entry.outputTokens !== undefined ? ((entry.inputTokens ?? 0) + (entry.outputTokens ?? 0)).toLocaleString() : '—'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </Card>}
  </div>;
}
