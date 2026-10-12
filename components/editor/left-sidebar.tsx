'use client';

import { useState } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { createTextElement, createShapeElement, createImageElement } from '@/lib/canvas/element-factory';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Type, Image as ImageIcon, Shapes, Upload,
  Square, Circle, Triangle as TriangleIcon, Star, Minus,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { ShapeKind } from '@/types';
import { FONT_OPTIONS, COLOR_PALETTE } from '@/lib/canvas/themes';
import { FileUpload } from './sidebar/image-upload-tab';
import { ImageGenerator } from './sidebar/image-generator';

type Tab = 'text' | 'shapes' | 'images' | 'uploads' | 'ai' | 'templates';

interface LeftSidebarProps {
  onOpenGenerator?: () => void;
}

export function LeftSidebar({ onOpenGenerator }: LeftSidebarProps) {
  const [tab, setTab] = useState<Tab>('text');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { project, addElement } = useEditorStore();

  if (!project) return null;

  const addText = (preset: 'heading' | 'subheading' | 'body', fontFamily?: string) => {
    const w = project.dimensions.width * 0.7;
    const h = project.dimensions.height * 0.1;
    const el = createTextElement({
      x: (project.dimensions.width - w) / 2,
      y: (project.dimensions.height - h) / 2,
      width: w,
      height: h,
      text: preset === 'heading' ? 'Add a heading' : preset === 'subheading' ? 'Add a subheading' : 'Add some body text',
      fontSize: preset === 'heading' ? 72 : preset === 'subheading' ? 48 : 28,
      fontStyle: preset === 'heading' ? 'bold' : 'normal',
      fill: project.theme.text,
      fontFamily: fontFamily ?? (preset === 'heading' ? project.theme.fontHeading : project.theme.fontBody),
      name: preset === 'heading' ? 'Heading' : preset === 'subheading' ? 'Subheading' : 'Body Text',
    });
    addElement(el);
  };

  const addShape = (shape: ShapeKind) => {
    const size = project.dimensions.width * 0.15;
    const el = createShapeElement({
      x: (project.dimensions.width - size) / 2,
      y: (project.dimensions.height - size) / 2,
      width: size,
      height: size,
      shape,
      fill: project.theme.accent,
      name: `${shape} shape`,
    });
    if (shape === 'line') {
      el.height = 4;
      el.strokeWidth = 4;
    }
    addElement(el);
  };

  const addImageByUrl = (url: string) => {
    const w = project.dimensions.width * 0.5;
    const h = project.dimensions.height * 0.3;
    const el = createImageElement({
      x: (project.dimensions.width - w) / 2,
      y: (project.dimensions.height - h) / 2,
      width: w,
      height: h,
      src: url,
      name: 'Image',
    });
    addElement(el);
  };

  const addGeneratedImage = (src: string, imagePrompt: string) => {
    const w = project.dimensions.width * 0.5;
    const h = project.dimensions.height * 0.3;
    addElement(createImageElement({
      x: (project.dimensions.width - w) / 2,
      y: (project.dimensions.height - h) / 2,
      width: w,
      height: h,
      src,
      imagePrompt,
      name: 'Generated Image',
    }));
  };

  const tabs: { key: Tab; icon: typeof Type; label: string }[] = [
    { key: 'text', icon: Type, label: 'Text' },
    { key: 'shapes', icon: Shapes, label: 'Shapes' },
    { key: 'images', icon: ImageIcon, label: 'Images' },
    { key: 'uploads', icon: Upload, label: 'Uploads' },
    { key: 'ai', icon: Shapes, label: 'AI' },
  ];

  return (
    <div className="flex h-full">
      {/* Icon rail */}
      <div className="flex w-16 flex-shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-3">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => {
              if (isCollapsed) {
                setIsCollapsed(false);
                setTab(key);
              } else {
                setTab(key === tab && !isCollapsed ? tab : key);
              }
            }}
            className={`flex w-14 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors ${
              tab === key && !isCollapsed ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}

        {/* Collapse toggle at the bottom */}
        <div className="mt-auto">
          <button
            onClick={() => setIsCollapsed((v) => !v)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex w-14 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {/* Content panel */}
      {!isCollapsed && (
        <div className="w-64 border-r border-border bg-card">
          <ScrollArea className="h-full">
            <div className="p-3">
              {tab === 'text' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Add Text</h3>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => addText('heading')}>
                    <Type className="h-4 w-4" /> Add Heading
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => addText('subheading')}>
                    <Type className="h-4 w-4" /> Add Subheading
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => addText('body')}>
                    <Type className="h-4 w-4" /> Add Body Text
                  </Button>

                  <Separator className="my-3" />
                  <h4 className="text-xs font-medium text-muted-foreground">Font Styles</h4>
                  {FONT_OPTIONS.slice(0, 8).map((font) => (
                    <button
                      key={font}
                      onClick={() => addText('body', font)}
                      className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                      style={{ fontFamily: font }}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              )}

              {tab === 'shapes' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Shapes</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { shape: 'rect', icon: Square, label: 'Rectangle' },
                      { shape: 'ellipse', icon: Circle, label: 'Circle' },
                      { shape: 'triangle', icon: TriangleIcon, label: 'Triangle' },
                      { shape: 'star', icon: Star, label: 'Star' },
                      { shape: 'line', icon: Minus, label: 'Line' },
                    ] as const).map(({ shape, icon: Icon, label }) => (
                      <button
                        key={shape}
                        onClick={() => addShape(shape)}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-border transition-colors hover:border-primary hover:bg-accent"
                      >
                        <Icon className="h-6 w-6 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </button>
                    ))}
                  </div>

                  <Separator className="my-3" />
                  <h4 className="text-xs font-medium text-muted-foreground">Color Palette</h4>
                  <div className="grid grid-cols-5 gap-1.5">
                    {COLOR_PALETTE.slice(0, 15).map((color) => (
                      <button
                        key={color}
                        onClick={() => addShape({} as ShapeKind)}
                        className="aspect-square rounded border border-border"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {tab === 'images' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Images</h3>
                  <ImageGenerator
                    width={project.dimensions.width * 0.5}
                    height={project.dimensions.height * 0.3}
                    onAdd={addGeneratedImage}
                  />
                </div>
              )}

              {tab === 'uploads' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Uploads</h3>
                  <FileUpload
                    onUpload={(dataUrl) => addImageByUrl(dataUrl)}
                  />
                </div>
              )}

              {tab === 'ai' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">AI Tools</h3>
                  <p className="text-xs text-muted-foreground">
                    Select an element on the canvas, then use AI to rewrite text or change its style.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={onOpenGenerator}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"/></svg>
                    Generate New Slideshow
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
