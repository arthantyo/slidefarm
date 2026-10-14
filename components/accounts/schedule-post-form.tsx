'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { exportSlide } from '@/lib/export';
import { slideToDataURL } from '@/lib/export/svg-renderer';
import type { ScheduledPost } from '@/lib/server/tiktok-schedule';
import type { Project } from '@/types';

type Account = { openId: string; displayName: string; scopes: string[] };
type Creator = { privacy_level_options?: string[] };

interface Props {
  account: Account;
  creator: Creator | null;
  projects: Project[];
  posts: ScheduledPost[];
  initialDay: string;
  initialTime: string;
  editingPost: ScheduledPost | null;
  onSaved: (post: ScheduledPost) => Promise<void>;
}

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const postDate = (post: ScheduledPost) => post.calendarDate || dateKey(new Date(post.scheduledAt));

export function SchedulePostForm({ account, creator, projects, posts, initialDay, initialTime, editingPost, onSaved }: Props) {
  const [day, setDay] = useState(initialDay);
  const [time, setTime] = useState(initialTime);
  const [projectId, setProjectId] = useState(editingPost?.projectId ?? '');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectPreviews, setProjectPreviews] = useState<string[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [title, setTitle] = useState(editingPost?.title ?? '');
  const [description, setDescription] = useState(editingPost?.description ?? '');
  const [privacy, setPrivacy] = useState(editingPost?.privacyLevel ?? creator?.privacy_level_options?.[0] ?? '');
  const [disableComment, setDisableComment] = useState(editingPost?.disableComment ?? false);
  const [autoAddMusic, setAutoAddMusic] = useState(editingPost?.autoAddMusic ?? true);
  const [isAigc, setIsAigc] = useState(editingPost?.isAigc ?? false);
  const [brandContent, setBrandContent] = useState(editingPost?.brandContent ?? false);
  const [brandOrganic, setBrandOrganic] = useState(editingPost?.brandOrganic ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedProject = projects.find((project) => project.id === projectId);
  const matchingProjects = projects.filter((project) => project.name.toLowerCase().includes(projectSearch.trim().toLowerCase()));
  const dayIsFull = posts.filter((post) => post.status !== 'canceled' && post.id !== editingPost?.id && postDate(post) === day).length >= 2;

  useEffect(() => {
    if (!selectedProject) { setProjectPreviews([]); return; }
    let active = true;
    setProjectPreviews([]); setActivePreviewIndex(0); setPreviewError(''); setPreviewLoading(true);
    void (async () => {
      try {
        const previews: string[] = [];
        for (const slide of selectedProject.slides) {
          const image = await slideToDataURL(slide, selectedProject.dimensions.width, selectedProject.dimensions.height);
          if (!active) return;
          previews.push(image);
          setProjectPreviews([...previews]);
        }
      } catch (cause) {
        if (active) setPreviewError(cause instanceof Error ? cause.message : 'Could not preview this project.');
      } finally { if (active) setPreviewLoading(false); }
    })();
    return () => { active = false; };
  }, [selectedProject]);

  const save = async () => {
    setBusy(true); setError('');
    try {
      if (!selectedProject || !selectedProject.slides.length || selectedProject.slides.length > 35) throw new Error('Choose a project with 1-35 slides.');
      if (dayIsFull) throw new Error('Only two posts can be planned for this day.');
      const scheduledAt = new Date(`${day}T${time}`).getTime();
      if (!Number.isFinite(scheduledAt) || scheduledAt < Date.now()) throw new Error('Choose a future date and time.');
      let images = editingPost?.projectId === projectId ? editingPost.images : undefined;
      if (!images) {
        const form = new FormData();
        for (const slide of selectedProject.slides) form.append('images', await exportSlide(slide, selectedProject.dimensions.width, selectedProject.dimensions.height, 'png'), 'slide.png');
        const uploaded = await fetch('/api/tiktok/assets', { method: 'POST', body: form });
        const result = await uploaded.json() as { urls?: string[]; error?: string };
        if (!uploaded.ok || !result.urls) throw new Error(result.error || 'Could not prepare slides for TikTok.');
        images = result.urls;
      }
      const response = await fetch('/api/tiktok/schedule', {
        method: editingPost ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPost?.id, openId: account.openId, projectId, projectName: selectedProject.name, calendarDate: day, title, description, images, privacyLevel: privacy, disableComment, autoAddMusic, isAigc, brandContent, brandOrganic, scheduledAt }),
      });
      const result = await response.json() as { post?: ScheduledPost; error?: string };
      if (!response.ok || !result.post) throw new Error(result.error || 'Could not schedule post.');
      await onSaved(result.post);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not schedule post.'); }
    finally { setBusy(false); }
  };

  const displayDate = new Date(`${day}T${time || '00:00'}`);

  return <div className="flex h-[90vh] flex-col lg:relative lg:block lg:h-[78vh]">
    <section className="flex h-[45vh] min-w-0 flex-none flex-col bg-muted/60 lg:mr-[340px] lg:h-full" aria-label="Project preview">
      <div className="mx-auto rounded-b-2xl bg-background px-5 py-2 text-center text-sm font-medium shadow-sm">{Number.isNaN(displayDate.getTime()) ? 'Choose a date and time' : `${displayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} at ${displayDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}</div>
      <div className="relative flex min-h-0 flex-1 items-center px-6 py-6">
        {projectPreviews.length > 0 ? <div className="grid w-full grid-cols-3 items-center gap-3">{projectPreviews.slice(activePreviewIndex, activePreviewIndex + 3).map((src, offset) => <button key={activePreviewIndex + offset} type="button" onClick={() => setActivePreviewIndex(activePreviewIndex + offset)} style={{ aspectRatio: `${selectedProject?.dimensions.width ?? 9} / ${selectedProject?.dimensions.height ?? 16}` }} className="min-w-0 max-h-[22vh] overflow-hidden rounded-xl bg-background shadow-sm lg:max-h-[55vh]"><Image src={src} alt={`Slide ${activePreviewIndex + offset + 1} of ${selectedProject?.name ?? 'project'}`} width={selectedProject?.dimensions.width ?? 320} height={selectedProject?.dimensions.height ?? 560} unoptimized className="h-full w-full object-contain" /></button>)}</div> : <p className="w-full text-center text-sm text-muted-foreground">{previewLoading ? 'Rendering slide preview…' : selectedProject ? 'Preview will appear here.' : 'Choose a project to preview its slides.'}</p>}
        {activePreviewIndex > 0 && <Button type="button" size="icon" variant="secondary" aria-label="Previous slide" onClick={() => setActivePreviewIndex(activePreviewIndex - 1)} className="absolute left-2 top-1/2 rounded-full"><ChevronLeft className="h-4 w-4" /></Button>}
        {activePreviewIndex < projectPreviews.length - 1 && <Button type="button" size="icon" variant="secondary" aria-label="Next slide" onClick={() => setActivePreviewIndex(activePreviewIndex + 1)} className="absolute right-2 top-1/2 rounded-full"><ChevronRight className="h-4 w-4" /></Button>}
      </div>
      {previewError && <p role="alert" className="px-6 text-xs text-destructive">{previewError}</p>}
      {projectPreviews.length > 0 && <div className="flex justify-center gap-2 pb-4" aria-label="Slide pagination">{projectPreviews.map((_, index) => <button key={index} type="button" aria-label={`Go to slide ${index + 1}`} aria-current={activePreviewIndex === index} onClick={() => setActivePreviewIndex(index)} className={`h-2 w-2 rounded-full ${activePreviewIndex === index ? 'bg-primary' : 'bg-muted-foreground/30'}`} />)}</div>}
      <div className="flex items-center gap-4 border-t bg-background/90 px-6 py-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">{account.displayName.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{account.displayName}</p><p className="truncate text-sm font-medium">{title || selectedProject?.name || 'Post title'}</p><p className="truncate text-xs text-muted-foreground">{description || 'Post description'}</p></div><span className="text-xs text-muted-foreground">{selectedProject?.slides.length ?? 0} slides</span></div>
    </section>
    <section className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto border-l bg-background px-5 py-6 lg:absolute lg:inset-y-0 lg:right-0 lg:w-[340px]" aria-label="TikTok post details">
      <div className="pr-8"><h3 className="text-lg font-semibold">{editingPost ? 'Edit post' : 'Schedule post'}</h3><p className="text-sm text-muted-foreground">{account.displayName}</p></div>
      {error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>}
      <div className="space-y-2"><Label htmlFor="schedule-project-search">Project</Label><Input id="schedule-project-search" value={projectSearch} onChange={(event) => setProjectSearch(event.target.value)} placeholder="Search projects by name" /><div className="max-h-36 overflow-y-auto rounded-md border p-1" role="listbox" aria-label="Projects">{matchingProjects.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No matching projects.</p> : matchingProjects.map((project) => <button key={project.id} type="button" role="option" aria-selected={projectId === project.id} onClick={() => setProjectId(project.id)} className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-accent ${projectId === project.id ? 'bg-primary/10 font-medium' : ''}`}><span className="truncate">{project.name}</span><span className="ml-2 shrink-0 text-xs text-muted-foreground">{project.slides.length} slides</span></button>)}</div>{selectedProject && <p className="text-xs text-muted-foreground">Selected: {selectedProject.name}</p>}</div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="schedule-date">Date</Label><Input id="schedule-date" type="date" value={day} onChange={(event) => setDay(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="schedule-time">Time (local)</Label><Input id="schedule-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div></div>
      <div className="space-y-2"><Label htmlFor="schedule-title">Title</Label><Input id="schedule-title" maxLength={90} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="schedule-description">Description</Label><Textarea id="schedule-description" rows={4} maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="schedule-privacy">Who can view</Label><select id="schedule-privacy" value={privacy} onChange={(event) => setPrivacy(event.target.value)} className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">{creator?.privacy_level_options?.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ').toLowerCase()}</option>)}</select></div>
      <div className="space-y-2 text-sm">{[['Disable comments', disableComment, setDisableComment], ['Add recommended music', autoAddMusic, setAutoAddMusic], ['AI-generated content', isAigc, setIsAigc], ['Paid partnership', brandContent, setBrandContent], ['Promotes my business', brandOrganic, setBrandOrganic]].map(([label, value, setter]) => <label key={label as string} className="flex items-center gap-2"><input type="checkbox" checked={value as boolean} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} />{label as string}</label>)}</div>
      <Button className="w-full" disabled={busy || dayIsFull || !creator || !projectId || !privacy || !account.scopes.includes('video.publish')} onClick={() => void save()}>{busy ? 'Saving...' : editingPost ? 'Save changes' : 'Schedule post'}</Button>{dayIsFull && <p className="text-xs text-destructive">Only two posts can be planned for this day.</p>}
      <p className="text-xs text-muted-foreground">Slides are prepared in R2 when you save. Automatic posting runs while the local server is on; reopen the calendar after restarting it.</p>
    </section>
  </div>;
}
