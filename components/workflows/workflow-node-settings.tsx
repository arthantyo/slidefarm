'use client';

import type { ProjectFolder, Template, Workflow } from '@/types';
import type { Connection, NodeId } from '@/lib/workflows/graph';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, FileJson, X } from 'lucide-react';

interface Props {
  draft: Workflow;
  selectedNode: NodeId;
  templates: Template[];
  template?: Template;
  keys: string[];
  folders: ProjectFolder[];
  update: (change: Partial<Workflow>) => void;
  selectTemplate: (id: string) => void;
  removeNode: (node: NodeId) => void;
  connections: Connection[];
  disconnect: (from: NodeId, to: NodeId) => void;
  close: () => void;
}

export function WorkflowNodeSettings({ draft, selectedNode, templates, template, keys, folders, update, selectTemplate, removeNode, connections, disconnect, close }: Props) {
  const title = selectedNode.startsWith('export:') ? 'Export' : { source: 'Source', template: 'Template', project: 'Review queue', export: 'Export' }[selectedNode as 'source' | 'template' | 'project' | 'export'];
  return <aside className="w-[340px] shrink-0 overflow-y-auto border-l bg-card p-5" aria-label="Node settings">
    <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Node settings</p><h2 className="text-lg font-semibold">{title}</h2></div><Button size="icon" variant="ghost" aria-label="Close node settings" onClick={close}><X className="h-4 w-4" /></Button></div>
    {selectedNode === 'source' && <div className="space-y-4"><div className="flex gap-2"><Button size="sm" variant={draft.sourceType === 'json' ? 'default' : 'outline'} onClick={() => update({ sourceType: 'json' })}><FileJson className="mr-1 h-4 w-4" />JSON</Button><Button size="sm" variant={draft.sourceType === 'ai' ? 'default' : 'outline'} onClick={() => update({ sourceType: 'ai' })}><Bot className="mr-1 h-4 w-4" />AI agent</Button></div>{draft.sourceType === 'ai' && <div className="space-y-1.5"><Label htmlFor="system-prompt">System prompt</Label><Textarea id="system-prompt" value={draft.systemPrompt} onChange={(event) => update({ systemPrompt: event.target.value })} rows={5} /></div>}<div className="space-y-1.5"><Label htmlFor="source-json">{draft.sourceType === 'ai' ? 'Input JSON' : 'Source JSON'}</Label><Textarea id="source-json" value={draft.sourceJson} onChange={(event) => update({ sourceJson: event.target.value })} rows={8} className="font-mono text-xs" spellCheck={false} /></div><p className="text-xs text-muted-foreground">Keys map to template placeholders.</p></div>}
    {selectedNode === 'template' && <div className="space-y-2"><Label htmlFor="workflow-template">Choose a template</Label><Select value={draft.templateId} onValueChange={selectTemplate}><SelectTrigger id="workflow-template"><SelectValue placeholder="Select template" /></SelectTrigger><SelectContent>{templates.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">{template ? keys.length ? `Placeholders: ${keys.join(', ')}` : 'This template has no placeholders.' : 'Choose a starter or custom template.'}</p></div>}
    {selectedNode === 'project' && <div className="space-y-2"><Label htmlFor="workflow-folder">Project folder</Label><Select value={draft.projectFolderId ?? 'unfiled'} onValueChange={(value) => update({ projectFolderId: value === 'unfiled' ? null : value })}><SelectTrigger id="workflow-folder"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unfiled">Unfiled</SelectItem>{folders.map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">The workflow pauses here so you can review and tweak each slide before export.</p></div>}
    {title === 'Export' && <div className="space-y-2"><Label htmlFor="workflow-format">Format</Label><Select value={draft.exportFormats?.[selectedNode] ?? draft.exportFormat} onValueChange={(value: Workflow['exportFormat']) => update({ exportFormats: { ...draft.exportFormats, [selectedNode]: value } })}><SelectTrigger id="workflow-format"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="zip">ZIP (all slides)</SelectItem><SelectItem value="pdf">PDF (all slides)</SelectItem><SelectItem value="png">PNG (first slide)</SelectItem><SelectItem value="jpg">JPG (first slide)</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Exports are saved in Media.</p></div>}
    <div className="mt-6 space-y-2"><p className="text-sm font-medium">Connections</p>{connections.filter((edge) => edge.from === selectedNode || edge.to === selectedNode).map((edge) => <div key={`${edge.from}-${edge.to}`} className="flex items-center justify-between gap-2 text-xs"><span className="truncate">{edge.from} → {edge.to}</span><Button size="sm" variant="ghost" onClick={() => disconnect(edge.from, edge.to)}>Remove</Button></div>)}</div>
    <Button variant="outline" className="mt-8 w-full" disabled={selectedNode === 'project' && !!draft.pendingProjectId} onClick={() => removeNode(selectedNode)}>Remove node</Button>
  </aside>;
}
