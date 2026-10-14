'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SchedulePostForm } from '@/components/accounts/schedule-post-form';
import type { Project } from '@/types';
import type { ScheduledPost } from '@/lib/server/tiktok-schedule';

type Account = { openId: string; displayName: string; scopes: string[] };
type Creator = { creator_nickname?: string; privacy_level_options?: string[] };

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const shiftDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const postDate = (post: ScheduledPost) => post.calendarDate || dateKey(new Date(post.scheduledAt));
const timeValue = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const statusLabel: Record<ScheduledPost['status'], string> = {
  scheduled: 'Scheduled', submitting: 'Submitting', submitted: 'Processing on TikTok',
  published: 'Published', failed: 'Failed', canceled: 'Canceled',
};

export default function AccountCalendarPage({ params }: { params: { openId: string } }) {
  const selected = params.openId;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [configured, setConfigured] = useState(false);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [viewStart, setViewStart] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  const [day, setDay] = useState(() => dateKey(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<'list' | 'form' | 'preview'>('list');
  const [previewId, setPreviewId] = useState('');
  const [formPost, setFormPost] = useState<ScheduledPost | null>(null);
  const [formTime, setFormTime] = useState(() => timeValue(new Date(Date.now() + 60 * 60_000)));
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadPosts = async (openId: string, isActive: () => boolean = () => true) => {
    const response = await fetch(`/api/tiktok/schedule?openId=${encodeURIComponent(openId)}`, { cache: 'no-store' });
    const result = await response.json() as { posts?: ScheduledPost[]; error?: string };
    if (!response.ok || !result.posts) throw new Error(result.error || 'Could not load calendar.');
    if (isActive()) setPosts(result.posts);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('error');
    if (authError) setError(authError === 'configure' ? 'TikTok Login Kit settings are incomplete.' : authError);
    if (params.has('connected')) setMessage('TikTok account connected.');
    if (authError || params.has('connected')) window.history.replaceState(null, '', window.location.pathname);
    void fetch('/api/tiktok/accounts', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Could not load accounts.');
      return response.json() as Promise<{ configured: boolean; accounts: Account[] }>;
    }).then((result) => {
      setConfigured(result.configured); setAccounts(result.accounts);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load accounts.'));
    void fetch('/api/projects', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Could not load projects.');
      return response.json() as Promise<{ projects: Project[] }>;
    }).then((result) => setProjects(result.projects)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load projects.'));
  }, []);

  useEffect(() => {
    setCreator(null); setPosts([]); setFormPost(null);
    if (!selected) return;
    let active = true;
    void fetch(`/api/tiktok/creator?openId=${encodeURIComponent(selected)}`, { cache: 'no-store' }).then(async (response) => {
      const result = await response.json() as { creator?: Creator; error?: string };
      if (!response.ok || !result.creator) throw new Error(result.error || 'Could not load creator settings.');
      return result.creator;
    }).then((result) => { if (active) setCreator(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load creator settings.'); });
    void loadPosts(selected, () => active).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load calendar.'); });
    const timer = setInterval(() => void loadPosts(selected, () => active).catch(() => {}), 30_000);
    return () => { active = false; clearInterval(timer); };
  }, [selected]);

  const editPost = (post: ScheduledPost) => {
    const scheduled = new Date(post.scheduledAt);
    setDay(postDate(post));
    setViewStart(new Date(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate()));
    setFormPost(post);
    setFormTime(timeValue(scheduled));
    setFormKey((current) => current + 1);
    setDialogView('form');
  };
  const cancelPost = async (id: string) => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/tiktok/schedule', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not cancel post.');
      await loadPosts(selected); setMessage('Scheduled post canceled.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not cancel post.'); }
    finally { setBusy(false); }
  };

  const cells = Array.from({ length: 28 }, (_, index) => shiftDays(viewStart, index));
  const viewEnd = cells[cells.length - 1];
  const dayPosts = posts.filter((post) => postDate(post) === day && post.status !== 'canceled');
  const previewPost = dayPosts.find((post) => post.id === previewId);
  const activeAccount = accounts.find((account) => account.openId === selected);
  const openNewForm = (slot?: number) => {
    setFormPost(null);
    setFormTime(slot === 0 ? '03:00' : slot === 1 ? '18:00' : timeValue(new Date(Date.now() + 60 * 60_000)));
    setFormKey((current) => current + 1);
    setDialogView('form');
  };

  const openSlot = (date: string, slot: number, post?: ScheduledPost) => {
    setDay(date);
    setDialogOpen(true);
    setError(''); setMessage('');
    if (post) { setPreviewId(post.id); setDialogView('preview'); }
    else openNewForm(slot);
  };

  return <><DashboardHeader /><main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/accounts" className="text-sm text-muted-foreground hover:underline">← Accounts</Link><h1 className="mt-2 text-3xl font-bold">{activeAccount?.displayName ?? 'TikTok account'}</h1><p className="mt-1 text-muted-foreground">Select a date to see its posts and previews.</p></div><Button asChild variant="outline"><Link href="/accounts">All accounts</Link></Button></div>
    {error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="rounded-md border p-3 text-sm">{message}</p>}
    {!configured && <Card className="p-5 text-sm text-muted-foreground">Set the TikTok client key, secret, and registered redirect URI to connect an account.</Card>}
    {!activeAccount ? <Card className="p-10 text-center text-muted-foreground">This account is not connected. <Link href="/accounts" className="underline">View accounts</Link></Card> : <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b p-4"><Button variant="ghost" size="icon" aria-label="Previous week" onClick={() => setViewStart(shiftDays(viewStart, -7))}><ChevronLeft className="h-4 w-4" /></Button><div className="flex items-center gap-3"><h2 className="text-lg font-semibold">{viewStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {viewEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</h2><Button size="sm" variant="outline" onClick={() => { const today = new Date(); setViewStart(new Date(today.getFullYear(), today.getMonth(), today.getDate())); }}>Today</Button></div><Button variant="ghost" size="icon" aria-label="Next week" onClick={() => setViewStart(shiftDays(viewStart, 7))}><ChevronRight className="h-4 w-4" /></Button></div>
      <div className="overflow-x-auto"><div className="grid min-w-[1050px] grid-cols-7">{cells.map((date) => {
        const key = dateKey(date);
        const entries = posts.filter((post) => postDate(post) === key && post.status !== 'canceled');
        return <div key={key} className={`min-w-0 border-b border-r ${key === dateKey(new Date()) ? 'bg-primary/5' : ''}`}>
          <button type="button" onClick={() => { setDay(key); setDialogView('list'); setDialogOpen(true); }} className="w-full border-b px-2 py-2 text-center text-sm font-medium hover:bg-accent">{date.toLocaleDateString(undefined, { weekday: 'short' })} {date.getDate()}{key === dateKey(new Date()) && <span className="ml-1 text-xs text-primary">Today</span>}</button>
          <div className="space-y-3 p-2">{[0, 1].map((slot) => {
            const post = entries[slot];
            const label = post ? new Date(post.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : slot === 0 ? '3:00 am' : '6:00 pm';
            return <div key={slot}><button type="button" aria-label={post ? `Preview ${post.projectName} on ${key}` : `Add post ${slot + 1} on ${key}`} onClick={() => openSlot(key, slot, post)} className={`relative flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border text-center transition-colors hover:bg-accent ${post ? 'border-solid' : 'border-dashed border-muted-foreground/35'}`}>
              {post?.images[0] ? <><Image src={post.images[0]} alt="" width={170} height={220} unoptimized className="h-full w-full object-cover" /><span className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 text-xs font-medium text-white line-clamp-2">{post.title || post.projectName}</span></> : <Plus className="h-5 w-5 text-muted-foreground" />}
            </button><p className="mt-1 text-center text-xs text-muted-foreground">{label}</p></div>;
          })}</div>
        </div>;
      })}</div></div>    </Card>}
    <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setDialogView('list'); }}><DialogContent className={dialogView === 'form' ? 'max-h-[90vh] max-w-7xl overflow-hidden p-0' : 'max-h-[90vh] max-w-3xl overflow-y-auto'}>
      {dialogView === 'form' ? <DialogHeader className="sr-only"><DialogTitle>{formPost ? 'Edit scheduled post' : 'Schedule a post'}</DialogTitle><DialogDescription>Preview slides and enter TikTok post details.</DialogDescription></DialogHeader> : <DialogHeader><DialogTitle>{dialogView === 'preview' ? 'Post preview' : new Date(`${day}T12:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</DialogTitle><DialogDescription>{dialogView === 'list' ? 'Scheduled content for this day' : 'Review the slides and post details.'}</DialogDescription></DialogHeader>}
      {dialogView !== 'form' && error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>}
      {dialogView !== 'form' && message && <p role="status" className="rounded-md border p-3 text-sm">{message}</p>}
      {dialogView === 'list' && <div className="space-y-4">
        {dayPosts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No content planned for this day.</p>}
        {dayPosts.map((post) => <div key={post.id} className="rounded-md border p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{post.projectName}</p><p className="text-sm">{post.title}</p><p className="text-xs text-muted-foreground">{new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {statusLabel[post.status]} · {post.images.length} slides</p>{post.error && <p className="mt-1 text-xs text-destructive">{post.error}</p>}</div><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { setPreviewId(post.id); setDialogView('preview'); }}>Preview</Button>{post.status === 'scheduled' && <><Button size="sm" variant="outline" onClick={() => editPost(post)}>Edit</Button><Button size="icon" variant="ghost" aria-label={`Cancel ${post.projectName}`} disabled={busy} onClick={() => void cancelPost(post.id)}><Trash2 className="h-4 w-4" /></Button></>}</div></div><div className="mt-3 flex gap-2 overflow-x-auto">{post.images.slice(0, 5).map((src, index) => <Image key={src} src={src} alt={`Slide ${index + 1} preview`} width={90} height={120} unoptimized className="h-28 w-20 shrink-0 rounded object-cover" />)}{post.images.length > 5 && <span className="self-center text-xs text-muted-foreground">+{post.images.length - 5} more</span>}</div></div>)}
        <Button disabled={dayPosts.length >= 2 || !creator || !activeAccount?.scopes.includes('video.publish')} onClick={() => openNewForm()}><Plus className="mr-2 h-4 w-4" />Add post</Button>{dayPosts.length >= 2 && <p className="text-xs text-muted-foreground">Two posts are already planned for this day.</p>}
      </div>}
      {dialogView === 'preview' && previewPost && <div className="space-y-4"><Button variant="ghost" onClick={() => setDialogView('list')}>← Back to posts</Button><div><h3 className="font-semibold">{previewPost.title || previewPost.projectName}</h3><p className="text-sm text-muted-foreground">{statusLabel[previewPost.status]} · {new Date(previewPost.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>{previewPost.description && <p className="mt-2 whitespace-pre-wrap text-sm">{previewPost.description}</p>}</div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{previewPost.images.map((src, index) => <div key={src}><Image src={src} alt={`Slide ${index + 1}`} width={240} height={320} unoptimized className="w-full rounded border object-contain" /><p className="mt-1 text-center text-xs text-muted-foreground">Slide {index + 1}</p></div>)}</div></div>}
      {dialogView === 'form' && activeAccount && <SchedulePostForm key={formKey} account={activeAccount} creator={creator} projects={projects} posts={posts} initialDay={day} initialTime={formTime} editingPost={formPost} onSaved={async (post) => { await loadPosts(selected); setDay(post.calendarDate); setViewStart(new Date(`${post.calendarDate}T12:00`)); setDialogView('list'); setMessage('Post saved to the calendar.'); }} />}    </DialogContent></Dialog>
  </main></>;
}
