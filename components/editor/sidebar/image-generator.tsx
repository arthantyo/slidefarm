'use client';

import { useEffect, useState } from 'react';
import { Loader2, BookmarkPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const STORAGE_KEY = 'slidefarm:saved-image-prompts';

interface ImageGeneratorProps {
  width: number;
  height: number;
  onAdd: (src: string, prompt: string) => void;
}

export function ImageGenerator({ width, height, onAdd }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(stored)) setSavedPrompts(stored.filter((item): item is string => typeof item === 'string'));
    } catch {
      // Ignore invalid local data.
    }
  }, []);

  const updateSavedPrompts = (next: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
    </div>
  );
}
