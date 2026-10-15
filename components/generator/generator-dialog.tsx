'use client';

import { aiRequestHeaders } from '@/lib/ai/user-key';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Sparkles, ChevronDown, Loader2, Wand2 } from 'lucide-react';
import { PLATFORM_PRESETS } from '@/types';
import type { GenerationOptions, AspectRatioKey, Tone, ContentDensity, VisualStyle, Project, TextElement } from '@/types';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import { assembleProject, assembleRemixedProject, isRemixableTextElement } from '@/lib/ai/assembly';
import type { RemixResult } from '@/lib/ai/remix-types';

interface GeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remixProject?: Project | null;
  /** True while a remix is in flight so the dashboard can show the new card. */
  onRemixPendingChange?: (pending: boolean) => void;
}

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: 'educational', label: 'Educational' },
  { value: 'casual', label: 'Casual' },
  { value: 'professional', label: 'Professional' },
  { value: 'persuasive', label: 'Persuasive' },
  { value: 'inspirational', label: 'Inspirational' },
];

const DENSITY_OPTIONS: { value: ContentDensity; label: string }[] = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
];

const STYLE_OPTIONS: { value: VisualStyle; label: string }[] = [
  { value: 'minimalist-vector', label: 'Minimalist Vector' },
  { value: 'monochrome-silhouette', label: 'Monochrome Silhouette' },
  { value: 'flat-illustration', label: 'Flat Illustration' },
  { value: 'editorial-illustration', label: 'Editorial Illustration' },
  { value: 'photorealistic', label: 'Photorealistic' },
  { value: '3d', label: '3D Render' },
  { value: 'watercolor', label: 'Watercolor' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'abstract', label: 'Abstract' },
];

export function GeneratorDialog({ open, onOpenChange, remixProject, onRemixPendingChange }: GeneratorDialogProps) {
  const router = useRouter();
  const loadProject = useEditorStore((s) => s.loadProject);
  const setGenerating = useEditorStore((s) => s.setGenerating);
  const setGenerationProgress = useEditorStore((s) => s.setGenerationProgress);

  const [prompt, setPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoSlideCount, setAutoSlideCount] = useState(true);
  const [slideCount, setSlideCount] = useState(6);
  const [platform, setPlatform] = useState('instagram-carousel');
  const [tone, setTone] = useState<Tone>('educational');
  const [density, setDensity] = useState<ContentDensity>('balanced');
  const [language, setLanguage] = useState('English');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('flat-illustration');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preserveFormOnOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (preserveFormOnOpen.current) {
      preserveFormOnOpen.current = false;
      return;
    }
    setPrompt('');
    setAutoSlideCount(!remixProject);
    setSlideCount(remixProject?.slides.length ?? 6);
    setError(null);
  }, [open, remixProject]);

  const handleGenerate = async () => {
    if (prompt.trim().length < 3) {
      setError('Please enter a longer prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerating(true);
    setGenerationProgress({ stage: 'Planning content structure', current: 1, total: 6 });

    const remixing = Boolean(remixProject);
    if (remixing) {
      onRemixPendingChange?.(true);
      onOpenChange(false);
    }

    try {
      const preset = PLATFORM_PRESETS.find((p) => p.key === platform) ?? PLATFORM_PRESETS[3];
      setGenerationProgress({ stage: 'Generating slide content', current: 2, total: 6 });
      const endpoint = remixProject ? '/api/ai/remix' : '/api/ai/generate';
      const options: GenerationOptions = {
        prompt: prompt.trim(),
        slideCount: autoSlideCount ? 'auto' : slideCount,
        platform,
        aspectRatio: preset.aspectRatio,
        tone,
        contentDensity: density,
        language,
        visualStyle,
        customInstructions: customInstructions.trim() || undefined,
      };
      const body = remixProject ? {
        source: {
          name: remixProject.name,
          slides: remixProject.slides.map((slide) => ({
            type: slide.type,
            notes: slide.notes,
            texts: slide.elements
              .filter((element): element is TextElement => element.type === 'text' && isRemixableTextElement(element))
              .map((element) => ({
                name: element.name,
                text: element.text,
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
                fontSize: element.fontSize,
                placeholder: element.placeholder,
              })),
            visuals: slide.elements.flatMap<{ name: string; kind: string; description?: string }>((element) => {
              if (element.type === 'image') {
                return [{ name: element.name, kind: 'image', description: element.imagePrompt }];
              }
              if (element.type === 'shape' && element.name && element.name !== 'Shape') {
                return [{ name: element.name, kind: element.shape }];
              }
              return [];
            }),
          })),
        },
        instruction: prompt.trim(),
        tone,
        density,
        language,
        customInstructions: customInstructions.trim() || undefined,
      } : options;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiRequestHeaders() },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const result = await res.json();

      setGenerationProgress({ stage: 'Designing layouts', current: 3, total: 6 });

      await new Promise((r) => setTimeout(r, 200));

      setGenerationProgress({ stage: 'Assembling slides', current: 4, total: 6 });

      const project = remixProject
        ? assembleRemixedProject(result.remix as RemixResult, remixProject)
        : assembleProject(result.plan, preset.width, preset.height);

      setGenerationProgress({ stage: 'Preparing editor', current: 5, total: 6 });

      if (!await useProjectStore.getState().save(project)) {
        throw new Error('Could not save the generated project locally');
      }
      loadProject(project);

      setGenerationProgress({ stage: 'Done', current: 6, total: 6 });

      if (remixing) onRemixPendingChange?.(false);
      onOpenChange(false);
      router.push(`/editor/${project.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      if (remixing) {
        preserveFormOnOpen.current = true;
        onRemixPendingChange?.(false);
        onOpenChange(true);
      }
    } finally {
      setIsGenerating(false);
      setGenerating(false);
      setGenerationProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            {remixProject ? `Remix ${remixProject.name} with AI` : 'Generate Slideshow with AI'}
          </DialogTitle>
          <DialogDescription>
            {remixProject
              ? 'Describe what to change. A new slideshow will be created from this project.'
              : 'Enter a topic and let AI create a complete slideshow for you. Everything is editable afterward.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">{remixProject ? 'How should this slideshow change?' : 'What is your slideshow about?'}</Label>
            <Textarea
              id="prompt"
              placeholder={remixProject
                ? 'e.g. Make the advice specific to first-time founders, with a more direct tone'
                : 'e.g. 7 benefits of learning Python, 5 tips for saving money, how to start a morning routine...'}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleGenerate();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {remixProject
                ? 'Say what audience, angle, or message you want to change. The existing slide design stays in place.'
                : 'Tip: Include the number of slides, topic, and style for best results.'}
            </p>
          </div>

          {remixProject && (
            <div className="space-y-2">
              <Label htmlFor="remix-context">Important context to preserve (optional)</Label>
              <Textarea
                id="remix-context"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Slide 3 quotes a customer; it is not my own claim. Keep the contrast between slides 4 and 5."
                className="min-h-[70px] resize-none"
              />
            </div>
          )}

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              {/* Platform and slide count apply only to new decks. */}
              {!remixProject && <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_PRESETS.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label} ({p.width}×{p.height})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>}

              {/* Slide count */}
              {!remixProject && <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Slide Count</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Auto</span>
                    <Switch checked={autoSlideCount} onCheckedChange={setAutoSlideCount} />
                  </div>
                </div>
                {!autoSlideCount && (
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[slideCount]}
                      onValueChange={(v) => setSlideCount(v[0])}
                      min={2}
                      max={20}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-8 text-center text-sm font-medium">{slideCount}</span>
                  </div>
                )}
              </div>}

              {/* Tone + Density */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Content Density</Label>
                  <Select value={density} onValueChange={(v) => setDensity(v as ContentDensity)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DENSITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Visual style changes only new decks; remix keeps the existing design. */}
              <div className={remixProject ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
                {!remixProject && <div className="space-y-2">
                  <Label>Visual Style</Label>
                  <Select value={visualStyle} onValueChange={(v) => setVisualStyle(v as VisualStyle)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>}
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="English"
                  />
                </div>
              </div>

              {/* Custom instructions */}
              {!remixProject && <div className="space-y-2">
                <Label>Custom Instructions</Label>
                <Textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Any additional guidance for the AI..."
                  className="min-h-[60px] resize-none"
                />
              </div>}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating || prompt.trim().length < 3} className="gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  {remixProject ? 'Remix' : 'Generate'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
