"use client";

import { useRef, useState, type PointerEvent } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Trash2, GripVertical } from "lucide-react";
import { SlideThumbnail } from "@/components/editor/slide-thumbnail";

export function BottomSlideBar() {
  const { project, currentSlideId } = useEditorStore();
  const {
    setCurrentSlide,
    addSlide,
    duplicateSlide,
    deleteSlide,
    reorderSlides,
  } = useEditorStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const draggedSlideId = useRef<string | null>(null);
  const dropSlideId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);

  if (!project) return null;

  const finishDrag = (
    event: PointerEvent<HTMLButtonElement>,
    cancelled = false,
  ) => {
    if (draggedSlideId.current === null) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (
      !cancelled &&
      dropSlideId.current &&
      dropSlideId.current !== draggedSlideId.current
    ) {
      const from = project.slides.findIndex(
        (slide) => slide.id === draggedSlideId.current,
      );
      const to = project.slides.findIndex(
        (slide) => slide.id === dropSlideId.current,
      );
      if (from !== -1 && to !== -1) reorderSlides(from, to);
    }
    draggedSlideId.current = null;
    dropSlideId.current = null;
    setDraggingId(null);
    setDropId(null);
  };

  return (
    <div className="flex h-40 min-w-0 shrink-0 items-center gap-2 border-t border-border bg-card px-2 sm:px-3">
      {/* Actions */}
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => addSlide()}
          title="Add slide"
        >
          <Plus className="h-4 w-4" />
        </Button>
        {currentSlideId && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => duplicateSlide(currentSlideId)}
              title="Duplicate slide"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {project.slides.length > 1 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => deleteSlide(currentSlideId)}
                title="Delete slide"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      <Separator />

      {/* Slide thumbnails */}
      <div
        ref={scrollRef}
        className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
        aria-label="Slides"
      >
        <div className="flex w-max gap-2 py-1">
          {project.slides.map((slide, idx) => (
            <div
              key={slide.id}
              data-slide-id={slide.id}
              onClick={() => setCurrentSlide(slide.id)}
              className={`group relative shrink-0 cursor-pointer rounded-lg border-2 p-1 transition-all select-none ${
                draggingId === slide.id ? "opacity-50" : ""
              } ${
                dropId === slide.id
                  ? "border-primary ring-2 ring-primary/40"
                  : slide.id === currentSlideId
                    ? "border-primary"
                    : "border-border hover:border-muted-foreground"
              }`}
            >
              <span className="absolute left-1 top-1 z-10 rounded bg-black/60 px-1 text-[10px] font-medium text-white">
                {idx + 1}
              </span>
              <button
                type="button"
                aria-label={`Drag to reorder slide ${idx + 1}; use arrow keys to move it`}
                title="Drag to reorder slide (arrow keys also work)"
                className="absolute right-1 top-1 z-10 flex h-6 w-6 touch-none items-center justify-center rounded bg-black/60 text-white cursor-grab active:cursor-grabbing"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => {
                  if (event.pointerType === "mouse" && event.button !== 0)
                    return;
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  draggedSlideId.current = slide.id;
                  dropSlideId.current = null;
                  setDraggingId(slide.id);
                }}
                onPointerMove={(event) => {
                  if (draggedSlideId.current !== slide.id) return;
                  const strip = scrollRef.current;
                  if (!strip) return;
                  const bounds = strip.getBoundingClientRect();
                  if (event.clientX < bounds.left + 32) strip.scrollLeft -= 16;
                  if (event.clientX > bounds.right - 32) strip.scrollLeft += 16;
                  const target = document
                    .elementFromPoint(event.clientX, event.clientY)
                    ?.closest<HTMLElement>("[data-slide-id]");
                  const nextId =
                    target && strip.contains(target)
                      ? (target.dataset.slideId ?? null)
                      : null;
                  dropSlideId.current = nextId;
                  setDropId(nextId);
                }}
                onPointerUp={(event) => finishDrag(event)}
                onPointerCancel={(event) => finishDrag(event, true)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                    return;
                  event.preventDefault();
                  event.stopPropagation();
                  const to = idx + (event.key === "ArrowLeft" ? -1 : 1);
                  if (to >= 0 && to < project.slides.length)
                    reorderSlides(idx, to);
                }}
              >
                <GripVertical className="h-4 w-4" />
              </button>
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
      </div>
    </div>
  );
}

function Separator() {
  return <div className="h-16 w-px bg-border" />;
}
