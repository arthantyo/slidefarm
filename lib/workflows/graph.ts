import type { Workflow } from '@/types';

export type NodeType = 'source' | 'template' | 'project' | 'export';
export type NodeId = NodeType | `export:${string}`;
export type Connection = { from: NodeId; to: NodeId };

export const nodeType = (id: NodeId): NodeType => id.startsWith('export:') ? 'export' : id as NodeType;
export const workflowNodes = (workflow: Workflow): NodeId[] => workflow.nodes ?? ['source', 'template', 'export'];
export const workflowConnections = (workflow: Workflow): Connection[] => {
  if (workflow.connections) return workflow.connections;
  const nodes = workflowNodes(workflow);
  const chain: NodeId[] = ['source', 'template', 'project', 'export'].filter((id) => nodes.includes(id as NodeId)) as NodeId[];
  return chain.slice(1).map((to, index) => ({ from: chain[index], to }));
};

export function reachableNodes(workflow: Workflow): Set<NodeId> {
  const nodes = workflowNodes(workflow);
  const edges = workflowConnections(workflow);
  const visited = new Set<NodeId>();
  if (!nodes.includes('source')) return visited;
  const queue: NodeId[] = ['source'];
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    queue.push(...edges.filter((edge) => edge.from === id && nodes.includes(edge.to)).map((edge) => edge.to));
  }
  return visited;
}

export function canConnect(nodes: NodeId[], connections: Connection[], from: NodeId, to: NodeId): boolean {
  if (from === to || !nodes.includes(from) || !nodes.includes(to) || to === 'source' || nodeType(from) === 'export') return false;
  const valid = (from === 'source' && to === 'template') ||
    (from === 'template' && (to === 'project' || nodeType(to) === 'export')) ||
    (from === 'project' && nodeType(to) === 'export');
  if (!valid) return false;
  if (connections.some((edge) => edge.from === from && edge.to === to)) return false;
  const next: Connection[] = [...connections, { from, to }];
  const visited = new Set<NodeId>();
  const queue: NodeId[] = [to];
  while (queue.length) {
    const id = queue.shift()!;
    if (id === from) return false;
    if (visited.has(id)) continue;
    visited.add(id);
    queue.push(...next.filter((edge) => edge.from === id).map((edge) => edge.to));
  }
  return true;
}
