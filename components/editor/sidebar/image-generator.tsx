'use client';

import { useEffect, useState } from 'react';
import { Loader2, BookmarkPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { readSavedImagePrompts, SAVED_IMAGE_PROMPTS_EVENT, SAVED_IMAGE_PROMPTS_KEY } from '@/lib/canvas/saved-image-prompts';


interface ImageGeneratorProps {
  width: number;
  height: number;
  onAdd: (src: string, prompt: string) => void;
}

export function ImageGenerator({ width, height, onAdd }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<{ src: string; prompt: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSavedPrompts(readSavedImagePrompts());
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/generated-images', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load generated images.');
        return response.json() as Promise<{ images: { src: string; prompt: string }[] }>;
      })
      .then((data) => { if (active) setGeneratedImages(data.images); })
      .catch(() => { if (active) setError('Could not load generated images.'); });
    return () => { active = false; };
  }, []);

  const updateSavedPrompts = (next: string[]) => {
    try {
      localStorage.setItem(SAVED_IMAGE_PROMPTS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SAVED_IMAGE_PROMPTS_EVENT));
      setSavedPrompts(next);
      setError(null);
    } catch {
      setError('Could not save prompts in this browser.');
    }
  };

  const savePrompt = () => {
    const value = prompt.trim();
    if (value.length < 3 || savedPrompts.includes(value)) return;
    updateSavedPrompts([value, ...savedPrompts]);
  };

  const generate = async () => {
    const value = prompt.trim();
    if (value.length < 3 || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: value, width, height }),
      });
      const result = await response.json() as { src?: string; error?: string };
      if (!response.ok || !result.src) throw new Error(result.error || 'Image generation failed.');
      onAdd(result.src, value);
      const saveResponse = await fetch('/api/generated-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: result.src, prompt: value }),
      });
      if (!saveResponse.ok) throw new Error('Image added, but could not save it to the gallery.');
      setGeneratedImages((images) => [{ src: result.src!, prompt: value }, ...images]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Image generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">Generate image</h4>
      <Label htmlFor="sidebar-image-prompt" className="sr-only">Image prompt</Label>
      <Textarea
        id="sidebar-image-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Describe the image you want..."
        maxLength={2000}
        disabled={isGenerating}
      />
      <div className="flex gap-2">
        <Button className="flex-1" onClick={generate} disabled={isGenerating || prompt.trim().length < 3}>
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
        <Button variant="outline" size="icon" onClick={savePrompt} disabled={prompt.trim().length < 3 || savedPrompts.includes(prompt.trim())} title="Save prompt" aria-label="Save prompt">
          <BookmarkPlus className="h-4 w-4" />
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {savedPrompts.length > 0 && (
        <div className="space-y-1 pt-2">
          <h4 className="text-xs font-medium text-muted-foreground">Saved prompts</h4>
          {savedPrompts.map((saved) => (
            <div key={saved} className="flex h-8 items-center gap-1 rounded border border-border px-1">
              <button className="min-w-0 flex-1 truncate px-1 text-left text-xs hover:text-primary" onClick={() => setPrompt(saved)} title={saved}>
                {saved}
              </button>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => updateSavedPrompts(savedPrompts.filter((item) => item !== saved))} aria-label={`Delete saved prompt: ${saved}`}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {generatedImages.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-medium text-muted-foreground">Generated images</h4>
          <div className="columns-2 gap-2">
            {generatedImages.map(({ src, prompt }) => (
              <button
                key={src}
                type="button"
                onClick={() => onAdd(src, prompt)}
                title={`Add image: ${prompt}`}
                aria-label={`Add generated image: ${prompt}`}
                className="mb-2 block w-full break-inside-avoid overflow-hidden rounded border border-border transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={prompt} loading="lazy" className="block h-auto w-full" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
