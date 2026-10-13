"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Plus, Sparkles, Workflow } from "lucide-react";
import Cloudscape from "../shaders/cloudscape";

interface DashboardOverviewProps {
  onStartWorkflow: () => void;
  onGenerate: () => void;
  onCreateBlank: () => void;
  onBrowseTemplates: () => void;
}

export function DashboardOverview({
  onStartWorkflow,
  onGenerate,
  onCreateBlank,
  onBrowseTemplates,
}: DashboardOverviewProps) {
  const actions = [
    { label: "Generate with AI", icon: Sparkles, action: onGenerate },
    { label: "Blank Project", icon: Plus, action: onCreateBlank },
    { label: "Browse Templates", icon: LayoutGrid, action: onBrowseTemplates },
    { label: "Start Workflow", icon: Workflow, action: onStartWorkflow },
  ];

  return (
    <>
      <Cloudscape className="mb-10 rounded-2xl border border-border bg-black p-8">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Create slideshows at scale!
            </h1>
            <p className="max-w-xl text-lg text-white">
              Generate, edit, and export AI-powered posts and slideshows for any
              social media platform.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={onGenerate} className="gap-2 text-base">
              <Sparkles className="h-5 w-5" />
              Generate with AI
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onCreateBlank}
              className="gap-2 text-base"
            >
              <Plus className="h-5 w-5" />
              Blank Project
            </Button>
          </div>
        </div>
      </Cloudscape>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {actions.map(({ label, icon: Icon, action }) => (
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
    </>
  );
}
