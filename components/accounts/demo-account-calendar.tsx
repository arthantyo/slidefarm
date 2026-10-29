'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { AccountCalendar } from './account-calendar';
import { AccountPageHeader } from './account-page-header';
import { AccountPostDialog } from './account-post-dialog';
import { dateKey, postDate, timeValue } from './calendar-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProjectStore } from '@/stores/project-store';
import { DEMO_ACCOUNT_ID, DEMO_ACCOUNT_NAME } from '@/lib/demo-account';
import { demoSlide, readDemoPosts, readDemoTimes, writeDemoPosts } from '@/lib/demo-account-data';
import type { ScheduledPost } from '@/lib/server/tiktok-schedule';
import type { PostTimes } from '@/lib/server/tiktok-post-settings';

function DemoPostForm({ day, initialTime, editingPost, onSave }: {
  day: string; initialTime: string; editingPost: ScheduledPost | null;
  onSave: (post: ScheduledPost) => void;
}) {
  const projects = useProjectStore((state) => state.projects);
  const [projectId, setProjectId] = useState(editingPost?.projectId ?? '');
  const [title, setTitle] = useState(editingPost?.title ?? '');
  const [description, setDescription] = useState(editingPost?.description ?? '');
  const [time, setTime] = useState(editingPost ? timeValue(new Date(editingPost.scheduledAt)) : initialTime);
  const [error, setError] = useState('');
  const project = projects.find((item) => item.id === projectId);

  const save = () => {
    const scheduledAt = new Date(`${day}T${time}`).getTime();
    if (!Number.isFinite(scheduledAt) || scheduledAt < Date.now()) {
      setError('Choose a future date and time.');
      return;
    }
    const now = Date.now();
    const postTitle = title.trim() || project?.name || 'Dreamystars post';
    onSave({
      id: editingPost?.id ?? crypto.randomUUID(), openId: DEMO_ACCOUNT_ID,
      projectId: projectId || editingPost?.projectId || 'demo-sample',
      projectName: project?.name || editingPost?.projectName || postTitle,
      calendarDate: day, scheduledAt, title: postTitle, description,
      images: editingPost?.images ?? [demoSlide(postTitle, '#4f46e5')],
      privacyLevel: 'PUBLIC_TO_EVERYONE', postMode: 'DIRECT_POST',
      disableComment: false, autoAddMusic: true, isAigc: false,
      brandContent: false, brandOrganic: false, postingConsent: true,
      status: 'scheduled', createdAt: editingPost?.createdAt ?? now, updatedAt: now,
    });
  };

  return <div className="max-h-[85vh] space-y-4 overflow-y-auto px-6 pb-6">
    <p className="text-sm text-muted-foreground">This post stays in the demo calendar. Nothing is sent to TikTok.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="space-y-2"><Label htmlFor="demo-project">Project</Label><select id="demo-project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Showcase sample</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor="demo-title">Title</Label><Input id="demo-title" value={title} maxLength={90} onChange={(event) => setTitle(event.target.value)} placeholder="Post title" /></div>
    <div className="space-y-2"><Label htmlFor="demo-description">Description</Label><Textarea id="demo-description" value={description} maxLength={4000} onChange={(event) => setDescription(event.target.value)} placeholder="Caption" /></div>
    <div className="space-y-2"><Label htmlFor="demo-time">Posting time</Label><Input id="demo-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div>
    <Button onClick={save}>{editingPost ? 'Save changes' : 'Schedule demo post'}</Button>
  </div>;
}

export function DemoAccountCalendar() {
  const { projects, folders } = useProjectStore();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [postTimes, setPostTimes] = useState<PostTimes>(['10:00', '18:00']);
  const [loaded, setLoaded] = useState(false);
  const [viewStart, setViewStart] = useState(() => new Date(new Date().setHours(0, 0, 0, 0)));
  const [day, setDay] = useState(() => dateKey(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<'list' | 'form' | 'preview'>('list');
  const [previewId, setPreviewId] = useState('');
  const [formPost, setFormPost] = useState<ScheduledPost | null>(null);
  const [formTime, setFormTime] = useState('10:00');
  const [formSlot, setFormSlot] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setPosts(readDemoPosts());
    setPostTimes(readDemoTimes());
    setLoaded(true);
    void useProjectStore.getState().load();
  }, []);

  const updatePosts = (next: ScheduledPost[]) => {
    try { writeDemoPosts(next); setPosts(next); setError(''); }
    catch { setError('Could not save demo posts in this browser.'); }
  };
  const dayPosts = posts.filter((post) => postDate(post) === day && post.status !== 'canceled');
  const previewPost = dayPosts.find((post) => post.id === previewId);
  const openForm = (slot = dayPosts.length, targetDay = day) => {
    if (posts.filter((post) => postDate(post) === targetDay && post.status !== 'canceled').length >= 2) return;
    setFormPost(null);
    setFormSlot(slot);
    setFormTime(postTimes[slot] ?? postTimes[0]);
    setFormKey((key) => key + 1);
    setDialogView('form');
  };
  const editPost = (post: ScheduledPost) => {
    setFormPost(post);
    setFormSlot(Math.max(0, dayPosts.findIndex((item) => item.id === post.id)));
    setFormTime(timeValue(new Date(post.scheduledAt)));
    setFormKey((key) => key + 1);
    setDialogView('form');
  };
  const savePost = (post: ScheduledPost) => {
    updatePosts([...posts.filter((item) => item.id !== post.id), post].sort((a, b) => a.scheduledAt - b.scheduledAt));
    setDay(post.calendarDate);
    setDialogView('list');
    setMessage('Demo post saved.');
  };

  return <DashboardShell><main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
    <AccountPageHeader selected={DEMO_ACCOUNT_ID} displayName={DEMO_ACCOUNT_NAME} error={error} message={message} configured />
    <p className="rounded-md border bg-muted/50 p-3 text-sm">Demo account · Calendar changes stay in this browser session. Nothing is sent to TikTok.</p>
    <AccountCalendar viewStart={viewStart} posts={posts} postTimes={postTimes} postTimesLoaded={loaded} onViewStartChange={setViewStart} onDayOpen={(date) => { setDay(date); setDialogView('list'); setDialogOpen(true); }} openSlot={(date, slot, post) => { setDay(date); setDialogOpen(true); if (post) { setPreviewId(post.id); setDialogView('preview'); } else openForm(slot, date); }} />
    <AccountPostDialog dialogOpen={dialogOpen} dialogView={dialogView} day={day} error={error} message={message} formPost={formPost} dayPosts={dayPosts} previewPost={previewPost} busy={false} postTimesLoaded={loaded} canPublish activeAccount={{ openId: DEMO_ACCOUNT_ID, displayName: DEMO_ACCOUNT_NAME, scopes: [] }} formKey={formKey} projects={projects} folders={folders} setPosted={() => {}} posts={posts} formTime={formTime} formSlot={formSlot} onOpenChange={setDialogOpen} onPreview={(id) => { setPreviewId(id); setDialogView('preview'); }} onBack={() => setDialogView('list')} onEdit={editPost} onRetry={async () => {}} onCancel={async (id) => { updatePosts(posts.map((post) => post.id === id ? { ...post, status: 'canceled' } : post)); setMessage('Demo post canceled.'); }} onAdd={() => openForm()} onSaved={async () => {}} formContent={<DemoPostForm key={formKey} day={day} initialTime={formTime} editingPost={formPost} onSave={savePost} />} />
  </main></DashboardShell>;
}
