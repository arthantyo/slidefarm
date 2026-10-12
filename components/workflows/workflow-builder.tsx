"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlignHorizontalDistributeCenter, ArrowLeft, Loader2, LocateFixed, Play, Save } from "lucide-react";
import { WorkflowCanvas } from "./workflow-canvas";
import type { NodeType } from "./workflow-canvas";
import type { NodeId } from "@/lib/workflows/graph";
import { WorkflowNodeSettings } from "./workflow-node-settings";
import { WorkflowReviewPanel } from "./workflow-review-panel";
import { useWorkflowDocument } from "./use-workflow-document";
import { useWorkflowExecution } from "./use-workflow-execution";

export function WorkflowBuilder({ workflowId }: { workflowId: string }) {
  const [pan, setPan] = useState({ x: 80, y: 120 });
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);
  const [reviewOpen, setReviewOpen] = useState(true);
  const document = useWorkflowDocument(workflowId);
  const {
    draft,
    setDraft,
    loaded,
    busy,
    saving,
    error,
    message,
    statuses,
    reviewProject,
    reviewSlideIndex,
    setReviewSlideIndex,
    folders,
    templates,
    template,
    keys,
    nodes,
    connections,
    position,
    update,
    selectTemplate,
    updateReviewText,
    save,
  } = document;
  const { run, continueWorkflow, openFullEditor } = useWorkflowExecution(
    workflowId,
    document,
    () => setReviewOpen(true),
  );
  const addNode = (node: NodeType, at: { x: number; y: number }) => {
    document.addNode(node, at);
    if (node !== 'export' || !nodes.includes('export')) setSelectedNode(node);
  };
  const removeNode = (node: NodeId) => {
    document.removeNode(node);
    if (selectedNode === node) setSelectedNode(null);
  };
  const alignNodes = () => {
    if (!nodes.length) return;
    const left = Math.min(...nodes.map((node) => position(node).x));
    const top = Math.min(...nodes.map((node) => position(node).y));
    const nodePositions = nodes.reduce<Partial<Record<NodeId, { x: number; y: number }>>>(
      (positions, node, index) => ({ ...positions, [node]: { x: left + index * 390, y: top } }),
      {},
    );
    setDraft((current) => current ? { ...current, nodePositions: { ...current.nodePositions, ...nodePositions } } : current);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Back to workflows"
        >
          <Link href="/workflows">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        {draft && (
          <>
            <Label htmlFor="workflow-name" className="sr-only">
              Workflow name
            </Label>
            <Input
              id="workflow-name"
              className="h-8 w-48 border-transparent bg-transparent text-sm font-medium hover:border-border focus:border-border"
              value={draft.name}
              onChange={(event) => update({ name: event.target.value })}
            />
          </>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={alignNodes} disabled={nodes.length < 2} className="gap-2">
            <AlignHorizontalDistributeCenter className="h-4 w-4" /> Auto align
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Center canvas on first node"
            onClick={() => {
              const first = nodes[0];
              const start = first ? position(first) : { x: 0, y: 0 };
              setPan({ x: 80 - start.x, y: 120 - start.y });
            }}
          >
            <LocateFixed className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => void save()}
            disabled={!draft || busy}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={() => void run()}
            disabled={!draft || busy || !!draft.pendingProjectId}
            className="gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}{" "}
            Run workflow
          </Button>
        </div>
      </header>
      <section className="flex min-h-0 flex-1 flex-col">
        {!draft ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            {loaded ? "Workflow not found." : "Loading workflow…"}
          </div>
        ) : (
          <>
            {error && (
              <p
                role="alert"
                className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                className="mb-4 rounded-md border border-primary/40 p-3 text-sm"
              >
                {message}
              </p>
            )}
            <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
              <WorkflowCanvas
                draft={draft}
                nodes={nodes}
                connections={connections}
                position={position}
                pan={pan}
                setPan={setPan}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
                onAddNode={addNode}
                onConnect={document.connect}
                onDisconnect={document.disconnect}
                onMoveNode={(node, x, y) =>
                  setDraft((value) =>
                    value
                      ? {
                          ...value,
                          nodePositions: {
                            ...value.nodePositions,
                            [node]: { x, y },
                          },
                        }
                      : value,
                  )
                }
                statuses={statuses}
                templateName={template?.name}
                reviewProject={reviewProject}
                reviewOpen={reviewOpen}
                onOpenReview={() => setReviewOpen(true)}
              />
              {(!reviewProject || !reviewOpen) &&
                selectedNode &&
                nodes.includes(selectedNode) && (
                  <WorkflowNodeSettings
                    draft={draft}
                    selectedNode={selectedNode}
                    templates={templates}
                    template={template}
                    keys={keys}
                    folders={folders}
                    update={update}
                    selectTemplate={selectTemplate}
                    removeNode={removeNode}
                    connections={connections}
                    disconnect={document.disconnect}
                    close={() => setSelectedNode(null)}
                  />
                )}
              {reviewProject && reviewOpen && (
                <WorkflowReviewPanel
                  project={reviewProject}
                  slideIndex={reviewSlideIndex}
                  setSlideIndex={setReviewSlideIndex}
                  busy={busy}
                  close={() => setReviewOpen(false)}
                  updateText={updateReviewText}
                  continueWorkflow={() => void continueWorkflow()}
                  openFullEditor={() => void openFullEditor()}
                />
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
