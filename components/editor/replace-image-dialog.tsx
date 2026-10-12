'use client';

import { useState } from 'react';
import type { ImageElement } from '@/types';
import { useEditorStore } from '@/stores/editor-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface ReplaceImageDialogProps {
  element: ImageElement | null;
  slideId: string;
  onClose: () => void;
  onRemixPendingChange: (pending: boolean) => void;
}

export function ReplaceImageDialog({ element, slideId, onClose, onRemixPendingChange }: ReplaceImageDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const replaceImage = async () => {
    if (!element || prompt.trim().length < 3 || isGenerating) return;
    setIsGenerating(true);
    setDialogOpen(false);
    onRemixPendingChange(true);
    setError(null);
    try {
      const sourceResponse = await fetch(element.src);
      if (!sourceResponse.ok) throw new Error('Could not load the original image.');
      const sourceImage = await sourceResponse.blob();
      const body = new FormData();
      body.append('prompt', prompt.trim());
      body.append('width', String(element.width));
      body.append('height', String(element.height));
      const extension = sourceImage.type.split('/')[1]?.split('+')[0] || 'png';
      body.append('image', sourceImage, `source-image.${extension}`);
      const response = await fetch('/api/ai/image', {
        method: 'POST',
        body,
      });
      const result = await response.json() as { src?: string; error?: string };
      if (!response.ok || !result.src) throw new Error(result.error || 'Image generation failed.');

      const store = useEditorStore.getState();
      const current = store.project?.slides.find((slide) => slide.id === slideId)
        ?.elements.find((item) => item.id === element.id);
      if (!current || current.type !== 'image') throw new Error('This image is no longer on the slide.');
      store.pushHistory();
      store.updateSlide(slideId, (slide) => ({
        ...slide,
        elements: slide.elements.map((item) => item.id === element.id && item.type === 'image'
          ? { ...item, src: result.src!, imagePrompt: prompt.trim() }
          : item),
      }));
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Image generation failed.');
      setDialogOpen(true);
    } finally {
      setIsGenerating(false);
      onRemixPendingChange(false);
    }
  };

  return (
    <Dialog open={!!element && dialogOpen} onOpenChange={(open) => { if (!open && !isGenerating) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remix image</DialogTitle>
          <DialogDescription>Describe the new image. The original guides its style only; the new subject has a transparent background.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="replacement-image-prompt">New image description</Label>
          <Textarea
            id="replacement-image-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="A red fox curled up asleep, in the original image's style..."
            maxLength={2000}
            disabled={isGenerating}
            autoFocus
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={replaceImage} disabled={prompt.trim().length < 3}>
            Remix image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
