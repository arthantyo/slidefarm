'use client';

import { useEditorStore } from '@/stores/editor-store';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Trash2 } from 'lucide-react';
import { SlideThumbnail } from '@/components/editor/slide-thumbnail';
import { ScrollArea } from '@/components/ui/scroll-area';

export function BottomSlideBar() {
  const { project, currentSlideId } = useEditorStore();
  const { setCurrentSlide, addSlide, duplicateSlide, deleteSlide } = useEditorStore();

  if (!project) return null;

  return (
    <div className="flex h-28 items-center gap-2 border-t border-border bg-card px-3">
      {/* Actions */}
      <div className="flex flex-col gap-1">
        <Button variant="outline" size="icon" onClick={() => addSlide()} title="Add slide">
          <Plus className="h-4 w-4" />
        </Button>
        {currentSlideId && (
          <>
            <Button variant="outline" size="icon" onClick={() => duplicateSlide(currentSlideId)} title="Duplicate slide">
              <Copy className="h-4 w-4" />
            </Button>
            {project.slides.length > 1 && (
              <Button variant="outline" size="icon" onClick={() => deleteSlide(currentSlideId)} title="Delete slide">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      <Separator />

      {/* Slide thumbnails */}
      <ScrollArea className="flex-1">
        <div className="flex gap-2 py-1">
          {project.slides.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => setCurrentSlide(slide.id)}
              className={`group relative cursor-pointer rounded-lg border-2 p-1 transition-all ${
                slide.id === currentSlideId ? 'border-primary' : 'border-border hover:border-muted-foreground'
              }`}
            >
              <span className="absolute left-1 top-1 z-10 rounded bg-black/60 px-1 text-[10px] font-medium text-white">
                {idx + 1}
              </span>
              <SlideThumbnail
                slide={slide}
                width={project.dimensions.width}
                height={project.dimensions.height}
                theme={project.theme}
                maxWidth={80}
                maxHeight={80}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function Separator() {
  return <div className="h-16 w-px bg-border" />;
}
