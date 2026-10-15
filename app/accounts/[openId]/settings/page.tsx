'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard/shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { PostTimes } from '@/lib/server/tiktok-post-settings';

export default function AccountSettingsPage({ params }: { params: { openId: string } }) {
  const openId = params.openId;
  const [name, setName] = useState('Account');
  const [times, setTimes] = useState<PostTimes>(['03:00', '18:00']);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch('/api/tiktok/accounts', { cache: 'no-store' }).then((response) => response.json() as Promise<{ accounts?: { openId: string; displayName: string }[] }>),
      fetch(`/api/tiktok/post-settings?openId=${encodeURIComponent(openId)}`, { cache: 'no-store' }).then(async (response) => {
        const result = await response.json() as { times?: PostTimes; error?: string };
        if (!response.ok || !result.times) throw new Error(result.error || 'Could not load posting times.');
        return result.times;
      }),
    ]).then(([accounts, postTimes]) => {
      if (!active) return;
      setName(accounts.accounts?.find((account) => account.openId === openId)?.displayName ?? 'Account');
      setTimes(postTimes);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load settings.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [openId]);

  const save = async () => {
    setBusy(true); setError(''); setSaved(false);
    try {
      const response = await fetch('/api/tiktok/post-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openId, times }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not save posting times.');
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save posting times.'); }
    finally { setBusy(false); }
  };

  return <DashboardShell><main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
    <div><Link href={`/accounts/${encodeURIComponent(openId)}`} className="text-sm text-muted-foreground hover:underline">← Calendar</Link><h1 className="mt-2 text-3xl font-bold">{name} settings</h1></div>
    <Card className="space-y-4 p-6"><div><h2 className="text-lg font-semibold">Daily posting times</h2><p className="text-sm text-muted-foreground">These times apply to new Post 1 and Post 2 slots on this account&apos;s calendar.</p></div>
      {times.map((time, slot) => <label key={slot} className="flex max-w-xs items-center justify-between gap-4 text-sm font-medium">Post {slot + 1}<input type="time" value={time} disabled={loading || busy} onChange={(event) => { const next: PostTimes = [...times]; next[slot] = event.target.value; setTimes(next); setSaved(false); }} className="h-10 rounded-md border bg-background px-3" /></label>)}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{saved && <p role="status" className="text-sm text-muted-foreground">Posting times saved.</p>}
      <Button disabled={loading || busy || times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))} onClick={() => void save()}>{busy ? 'Saving...' : 'Save times'}</Button>
    </Card>
  </main></DashboardShell>;
}
