'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/project-store';
import { useEditorStore } from '@/stores/editor-store';
import { createBlankProject, STARTER_TEMPLATES } from '@/lib/canvas/templates';
import { DashboardHeader } from '@/components/dashboard/header';
import { ProjectCard } from '@/components/dashboard/project-card';
import { TemplateGallery } from '@/components/dashboard/template-gallery';
import { GeneratorDialog } from '@/components/generator/generator-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Plus, LayoutGrid, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { projects, load, delete: deleteProject, duplicate } = useProjectStore();
  const loadProject = useEditorStore((s) => s.loadProject);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    load();
  }, [load]);

  const sortedProjects = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleOpenProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      loadProject(project);
      router.push(`/editor/${projectId}`);
    }
  };

  const handleCreateBlank = () => {
    const project = createBlankProject('Untitled Project');
    useProjectStore.getState().save(project);
    loadProject(project);
    router.push(`/editor/${project.id}`);
  };

  const handleDelete = (projectId: string) => {
    deleteProject(projectId);
  };

  const handleDuplicate = (projectId: string) => {
    duplicate(projectId);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        isDark={theme === 'dark'}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Hero section */}
        <div className="mb-10 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 border border-border">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Create stunning slideshows with AI
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Generate complete slideshows from a single prompt, then customize every detail in the visual editor.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                onClick={() => setGeneratorOpen(true)}
                className="gap-2 text-base"
              >
                <Sparkles className="h-5 w-5" />
                Generate with AI
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleCreateBlank}
                className="gap-2 text-base"
              >
                <Plus className="h-5 w-5" />
                Blank Project
              </Button>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Generate with AI', icon: Sparkles, action: () => setGeneratorOpen(true) },
            { label: 'Blank Project', icon: Plus, action: handleCreateBlank },
            { label: 'Browse Templates', icon: LayoutGrid, action: () => setTemplatesOpen(true) },
            { label: 'Toggle Theme', icon: theme === 'dark' ? Sun : Moon, action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
          ].map(({ label, icon: Icon, action }) => (
            <Card
              key={label}
              className="cursor-pointer p-4 transition-all hover:border-primary/50 hover:shadow-md"
              onClick={action}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="projects" className="gap-2">
              <Clock className="h-4 w-4" />
              Recent Projects
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            {sortedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No projects yet</h3>
                  <p className="text-muted-foreground mt-1">
                    Generate your first slideshow with AI or start from a template.
                  </p>
                </div>
                <Button onClick={() => setGeneratorOpen(true)} className="gap-2 mt-2">
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={() => handleOpenProject(project.id)}
                    onDelete={() => handleDelete(project.id)}
                    onDuplicate={() => handleDuplicate(project.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates">
            <TemplateGallery
              onUseTemplate={(template) => {
                const project = {
                  ...JSON.parse(JSON.stringify(template)),
                  id: createBlankProject(template.name).id,
                  name: template.name,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
                useProjectStore.getState().save(project);
                loadProject(project);
                router.push(`/editor/${project.id}`);
              }}
            />
          </TabsContent>
        </Tabs>
      </main>

      <GeneratorDialog open={generatorOpen} onOpenChange={setGeneratorOpen} />
    </div>
  );
}
