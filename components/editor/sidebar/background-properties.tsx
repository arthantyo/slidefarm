'use client';

import React, { useEffect, useState } from 'react';
import type { BackgroundElement } from '@/types';
import type { ImageLibrary } from '@/lib/server/image-library';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ColorPicker } from './style-controls';
import { Button } from '@/components/ui/button';

interface BackgroundPropertiesProps {
  element: BackgroundElement;
  onUpdate: (updates: Partial<BackgroundElement>) => void;
}

export function BackgroundProperties({
  element,
  onUpdate,
}: BackgroundPropertiesProps) {
  const [library, setLibrary] = useState<ImageLibrary>({ folders: [], images: [] });
  useEffect(() => { void fetch('/api/image-library').then((response) => response.json()).then((result: ImageLibrary) => { if (Array.isArray(result.images)) setLibrary(result); }).catch(() => {}); }, []);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Fill Type</Label>
        <Select
          value={element.fillType}
          onValueChange={(v) => onUpdate({ fillType: v as BackgroundElement['fillType'] })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
            <SelectItem value="image">Image</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {element.fillType === 'image' && <div className="space-y-2">
        <Label className="text-xs">Image source</Label>
        <Select value={element.imageCollectionId || 'fixed'} onValueChange={(value) => {
          const first = library.images.find((image) => image.folderId === value);
          onUpdate({ imageCollectionId: value === 'fixed' ? undefined : value, imageSrc: value === 'fixed' ? element.imageSrc : first?.src });
        }}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="fixed">Fixed image</SelectItem>{library.folders.map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.name} ({library.images.filter((image) => image.folderId === folder.id).length})</SelectItem>)}</SelectContent>
        </Select>
        {element.imageCollectionId && <p className="text-xs text-muted-foreground">A random image from this collection is chosen for this slide when a project is generated from the template.</p>}
        <div className="grid grid-cols-3 gap-1.5">{library.images.filter((image) => !element.imageCollectionId || image.folderId === element.imageCollectionId).map((image) => <button key={image.id} type="button" title={image.name} aria-label={`Set ${image.name} as slide background`} onClick={() => onUpdate({ imageSrc: image.src })} className={`overflow-hidden rounded border-2 ${element.imageSrc === image.src ? 'border-primary' : 'border-transparent'}`}><img src={image.src} alt="" className="aspect-square w-full object-cover" /></button>)}</div>
        {!library.images.length && <p className="text-xs text-muted-foreground">Add images in the Images section first.</p>}
        {element.imageSrc && <Button size="sm" variant="outline" onClick={() => onUpdate({ imageSrc: undefined })}>Clear image</Button>}
      </div>}

      <ColorPicker
        label="Background Color"
        value={element.fill}
        onChange={(c) => onUpdate({ fill: c })}
      />

      {element.fillType === 'gradient' && (
        <>
          <ColorPicker
            label="Gradient Color 2"
            value={element.gradientColor2 || '#000000'}
            onChange={(c) => onUpdate({ gradientColor2: c })}
          />
          <div className="space-y-1.5">
            <Label className="text-xs">Gradient Angle</Label>
            <Slider
              value={[element.gradientAngle ?? 135]}
              onValueChange={(v) => onUpdate({ gradientAngle: v[0] })}
              min={0}
              max={360}
              step={1}
            />
          </div>
        </>
      )}
    </div>
  );
}
