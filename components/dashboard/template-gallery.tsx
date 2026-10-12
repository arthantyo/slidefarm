'use client';

import type { Template } from '@/types';
import { STARTER_TEMPLATES } from '@/lib/canvas/templates';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SlideThumbnail } from '@/components/editor/slide-thumbnail';
import { Badge } from '@/components/ui/badge';

interface TemplateGalleryProps {
  onUseTemplate: (template: Template) => void;
}

export function TemplateGallery({ onUseTemplate }: TemplateGalleryProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {STARTER_TEMPLATES.map((template) => {
        const aspectRatio = template.dimensions.width / template.dimensions.height;
        return (
          <Card
            key={template.id}
            className="group cursor-pointer overflow-hidden p-0 transition-all hover:shadow-lg hover:border-primary/30"
            onClick={() => onUseTemplate(template)}
          >
            <div
              className="relative overflow-hidden bg-muted"
              style={{ aspectRatio: `${aspectRatio}` }}
            >
              <SlideThumbnail
                slide={template.slides[0]}
                width={template.dimensions.width}
                height={template.dimensions.height}
                theme={template.theme}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                <Button size="sm">Use Template</Button>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-semibold">{template.name}</h3>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {template.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
