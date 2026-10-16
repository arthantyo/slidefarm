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
import { Sparkles, ChevronDown, Loader2, Wand2 } from 'lucide-react';
import type { Tone, ContentDensity, Project, TextElement } from '@/types';
import { useEditorStore } from '@/stores/editor-store';
import { useProjectStore } from '@/stores/project-store';
import { isRemixableTextElement } from '@/lib/ai/assembly';
import { fillTemplateFromData, loadTemplateCollectionImages } from '@/lib/canvas/template-filler';
import { useCustomTemplateStore } from '@/stores/custom-template-store';

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

export function GeneratorDialog({ open, onOpenChange, remixProject, onRemixPendingChange }: GeneratorDialogProps) {
  const router = useRouter();
  const loadProject = useEditorStore((s) => s.loadProject);
  const setGenerating = useEditorStore((s) => s.setGenerating);
  const setGenerationProgress = useEditorStore((s) => s.setGenerationProgress);

  const [prompt, setPrompt] = useState('');
  const templates = useCustomTemplateStore((state) => state.templates);
  const loadTemplates = useCustomTemplateStore((state) => state.load);
  const [templateId, setTemplateId] = useState('');
  const [model, setModel] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tone, setTone] = useState<Tone>('educational');
  const [density, setDensity] = useState<ContentDensity>('balanced');
  const [language, setLanguage] = useState('English');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preserveFormOnOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (!remixProject) void loadTemplates();
    if (preserveFormOnOpen.current) {
      preserveFormOnOpen.current = false;
      return;
    }
    setPrompt('');
    setError(null);
  }, [open, remixProject, loadTemplates]);

  const handleGenerate = async () => {
    if (prompt.trim().length < 3) {
      setError('Please enter a longer prompt');
      return;
    }
    const template = templates.find((item) => item.id === templateId);
    if (!remixProject && !template) {
      setError('Choose a template before generating.');
      return;
    }
    const textElements = template?.slides.flatMap((slide) => slide.elements.filter((element): element is TextElement => element.type === 'text' && Boolean(element.placeholder))) ?? [];
    if (!remixProject && !textElements.length) {
      setError('Choose a template with text placeholders.');
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
      setGenerationProgress({ stage: 'Generating slide content', current: 2, total: 6 });
      const endpoint = remixProject ? '/api/remix-jobs' : '/api/ai/workflow-content';
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
            images: slide.elements.flatMap((element) => element.type === 'image' ? [{ name: element.name, description: element.imagePrompt, x: element.x, y: element.y, width: element.width, height: element.height }] : []),
          })),
        },
        instruction: prompt.trim(),
        model: model.trim() || undefined,
        tone,
        density,
        language,
        customInstructions: customInstructions.trim() || undefined,
      } : {
        systemPrompt: `Create engaging slideshow copy for this topic: ${prompt.trim()}. Tone: ${tone}. Content density: ${density}. Language: ${language}. ${customInstructions.trim()} Preserve the role of each template text placeholder and keep text concise enough to fit its existing box. For repeated placeholders, return an array with one distinct value per occurrence. Placeholder counts: ${JSON.stringify(Object.fromEntries(Array.from(new Set(textElements.map((element) => element.placeholder!)), (key) => [key, textElements.filter((element) => element.placeholder === key).length])))}.`,
        source: { topic: prompt.trim() },
        placeholderKeys: Array.from(new Set(textElements.map((element) => element.placeholder!))),
        model: model.trim() || undefined,
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiRequestHeaders() },
        body: JSON.stringify(remixProject ? { sourceProjectId: remixProject.id, request: body } : body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const result = await res.json();
      if (remixProject) return;

      setGenerationProgress({ stage: 'Designing layouts', current: 3, total: 6 });

      await new Promise((r) => setTimeout(r, 200));

      setGenerationProgress({ stage: 'Assembling slides', current: 4, total: 6 });

      const collectionImages = await loadTemplateCollectionImages(template!);
      const project = fillTemplateFromData(template!, result.data, prompt.trim().slice(0, 100), collectionImages);

      setGenerationProgress({ stage: 'Preparing editor', current: 5, total: 6 });

      if (!await useProjectStore.getState().save(project)) {
        throw new Error('Could not save the generated project locally');
      }
      loadProject(project);

      setGenerationProgress({ stage: 'Done', current: 6, total: 6 });

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
                ? 'Say what audience, angle, or message to change. You can also say “keep the top image on every slide unchanged.”'
                : 'Tip: Include the number of slides, topic, and style for best results.'}
            </p>
          </div>

          {!remixProject && <div className="space-y-2">
            <Label htmlFor="generation-template">Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}><SelectTrigger id="generation-template"><SelectValue placeholder="Choose a template" /></SelectTrigger><SelectContent>{templates.filter((template) => template.slides.some((slide) => slide.elements.some((element) => element.type === 'text' && element.placeholder))).map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select>
            {!templates.length && <p className="text-xs text-muted-foreground">Create a template with text placeholders first.</p>}
          </div>}

          <div className="space-y-2">
            <Label htmlFor="generation-model">Model</Label>
            <Input id="generation-model" value={model} onChange={(event) => setModel(event.target.value)} placeholder="Default model" maxLength={100} />
            <p className="text-xs text-muted-foreground">Enter an OpenAI chat model ID, or leave blank to use the configured default.</p>
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
              {!remixProject && <p className="text-xs text-muted-foreground">Slide count and dimensions come from the chosen template.</p>}

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

              <div className="space-y-2">
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
            <Button onClick={handleGenerate} disabled={isGenerating || prompt.trim().length < 3 || (!remixProject && !templateId)} className="gap-2">
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
