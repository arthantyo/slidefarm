'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import { EditorTopBar } from '@/components/editor/editor-top-bar';
import { LeftSidebar } from '@/components/editor/left-sidebar';
import { RightSidebar } from '@/components/editor/right-sidebar';
import { BottomSlideBar } from '@/components/editor/bottom-slide-bar';
import { CanvasStage } from '@/components/editor/canvas-stage-wrapper';
import { GeneratorDialog } from '@/components/generator/generator-dialog';
import { Loader2 } from 'lucide-react';

export default function EditorPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { project, currentSlideId, selectedElementIds, zoom, loadProject } = useEditorStore();
  const getProject = useProjectStore((s) => s.get);
  const load = useProjectStore((s) => s.load);
  const loaded = useProjectStore((s) => s.loaded);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestProjectRef = useRef(project);
  const latestDirtyRef = useRef(useEditorStore.getState().isDirty);
  latestProjectRef.current = project;
  latestDirtyRef.current = useEditorStore.getState().isDirty;

  // Load project from store
  useEffect(() => {
    if (!loaded) {
      load();
      return;
    }
    const found = getProject(projectId);
    if (found) {
      loadProject(found);
    }
    setIsLoading(false);
  }, [projectId, loaded, load, getProject, loadProject]);

  // Autosave (debounced)
  useEffect(() => {
    if (!project || !project.id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const saved = await useProjectStore.getState().save(project);
      if (saved && latestProjectRef.current === project) {
        useEditorStore.getState().markClean();
      }
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [project]);

  // A pending autosave must survive navigation and page closure.
  useEffect(() => {
    const flush = () => {
      if (!latestDirtyRef.current || !latestProjectRef.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      const pendingProject = latestProjectRef.current;
      void useProjectStore.getState().save(pendingProject).then((saved) => {
        if (saved && useEditorStore.getState().project === pendingProject) {
          useEditorStore.getState().markClean();
        }
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flush();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isTyping) return;

      const cmd = e.metaKey || e.ctrlKey;

      // Undo
      if (cmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
        return;
      }
      // Redo
      if (cmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        useEditorStore.getState().redo();
        return;
      }
      // Copy
      if (cmd && e.key === 'c' && selectedElementIds.length > 0) {
        e.preventDefault();
        useEditorStore.getState().copySelected();
        return;
      }
      // Paste
      if (cmd && e.key === 'v') {
        e.preventDefault();
        useEditorStore.getState().paste();
        return;
      }
      // Duplicate
      if (cmd && e.key === 'd' && selectedElementIds.length > 0) {
        e.preventDefault();
        const id = selectedElementIds[0];
        useEditorStore.getState().duplicateElement(id);
        return;
      }
      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) {
        e.preventDefault();
        selectedElementIds.forEach((id) => {
          const el = project?.slides.find((s) => s.id === currentSlideId)?.elements.find((el) => el.id === id);
          if (el && el.type !== 'background') {
            useEditorStore.getState().deleteElement(id);
          }
        });
        return;
      }
      // Save
      if (cmd && e.key === 's') {
        e.preventDefault();
        if (project) void useProjectStore.getState().save(project).then((saved) => {
          if (saved && useEditorStore.getState().project === project) {
            useEditorStore.getState().markClean();
          }
        });
        return;
      }
      // Escape — deselect
      if (e.key === 'Escape') {
        useEditorStore.getState().selectElement(null);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedElementIds, project, currentSlideId]);

  if (isLoading || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  const currentSlide = project.slides.find((s) => s.id === currentSlideId) ?? project.slides[0];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <EditorTopBar onOpenGenerator={() => setGeneratorOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar onOpenGenerator={() => setGeneratorOpen(true)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden bg-muted/20">
            <CanvasStage
              slide={currentSlide}
              width={project.dimensions.width}
              height={project.dimensions.height}
              theme={project.theme}
              zoom={zoom}
              selectedElementIds={selectedElementIds}
              onSelectElement={(id, addToSelection) => {
                const store = useEditorStore.getState();
                if (!id) {
                  store.selectElement(null);
                } else if (addToSelection) {
                  const current = store.selectedElementIds;
                  if (current.includes(id)) {
                    // Deselect that one element
                    store.selectMultiple(current.filter((x) => x !== id));
                  } else {
                    store.selectMultiple([...current, id]);
                  }
                } else {
                  store.selectElement(id);
                }
              }}
              onUpdateElement={(id, updates) => useEditorStore.getState().updateElement(id, updates)}
              onDeselectAll={() => useEditorStore.getState().selectElement(null)}
            />
          </div>
          <BottomSlideBar />
        </div>
        <RightSidebar />
      </div>
      <GeneratorDialog open={generatorOpen} onOpenChange={setGeneratorOpen} />
    </div>
  );
}
