'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Project } from '@/types';
import { SlidePreview } from '@/components/dashboard/slide-preview';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Loader2, PanelRightClose, Play } from 'lucide-react';

interface Props {
  project: Project;
  slideIndex: number;
  setSlideIndex: Dispatch<SetStateAction<number>>;
  busy: boolean;
  close: () => void;
  updateText: (slideId: string, elementId: string, text: string) => void;
  continueWorkflow: () => void;
  openFullEditor: () => void;
}

export function WorkflowReviewPanel({ project, slideIndex, setSlideIndex, busy, close, updateText, continueWorkflow, openFullEditor }: Props) {
  const slide = project.slides[slideIndex];
  return <aside className="w-[380px] shrink-0 overflow-y-auto border-l bg-card p-4" aria-label="Review queue">
    <div className="mb-4 flex items-start justify-between gap-2"><div><h2 className="text-lg font-semibold">Review queued project</h2><p className="text-sm text-muted-foreground">Check the generated slides before the workflow continues.</p></div><Button size="icon" variant="ghost" aria-label="Close review sidebar" onClick={close}><PanelRightClose className="h-4 w-4" /></Button></div>
    <div className="mb-4 flex items-center justify-between rounded-md border p-1" aria-label="Review slide navigation"><Button size="icon" variant="ghost" aria-label="Previous slide" disabled={slideIndex === 0} onClick={() => setSlideIndex((index) => Math.max(0, index - 1))}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm font-medium">Slide {slideIndex + 1} of {project.slides.length}</span><Button size="icon" variant="ghost" aria-label="Next slide" disabled={slideIndex >= project.slides.length - 1} onClick={() => setSlideIndex((index) => Math.min(project.slides.length - 1, index + 1))}><ChevronRight className="h-4 w-4" /></Button></div>
    {slide && <><div className="relative mb-4 h-64 overflow-hidden rounded-md border bg-muted"><SlidePreview slide={slide} width={project.dimensions.width} height={project.dimensions.height} theme={project.theme} /></div><div className="space-y-3">{slide.elements.filter((element) => element.type === 'text').map((element, index) => element.type === 'text' && <div key={element.id} className="space-y-1"><Label htmlFor={`review-${element.id}`}>Text {index + 1}</Label><Textarea id={`review-${element.id}`} value={element.text} onChange={(event) => updateText(slide.id, element.id, event.target.value)} rows={3} /></div>)}</div></>}
    <div className="mt-5 space-y-2"><Button className="w-full" disabled={busy} onClick={continueWorkflow}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Approve and continue</Button><Button variant="outline" className="w-full" disabled={busy} onClick={openFullEditor}>Open full slide editor</Button><p className="text-xs text-muted-foreground">Your tweaks are saved before opening the slide editor or continuing. Return here to approve the workflow.</p></div>
  </aside>;
}
