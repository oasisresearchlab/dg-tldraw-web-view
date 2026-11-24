import type { GraphData, GraphNode, GraphNodeType, GraphRelation, GraphRelationType } from "@dg/shared";

export interface GraphIndex {
  data: GraphData;
  nodesById: Map<string, GraphNode>;
  nodesByUrl: Map<string, GraphNode>;
  typesById: Map<string, GraphNodeType>;
  relationTypesById: Map<string, GraphRelationType>;
  outgoing: Map<string, GraphRelation[]>;
  incoming: Map<string, GraphRelation[]>;
}

export function indexGraph(data: GraphData): GraphIndex {
  const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
  const nodesByUrl = new Map<string, GraphNode>();
  for (const n of data.nodes) {
    nodesByUrl.set(n.iri, n);
    if (n.url) nodesByUrl.set(n.url.replace(/\/+$/, ""), n);
  }
  const outgoing = new Map<string, GraphRelation[]>();
  const incoming = new Map<string, GraphRelation[]>();
  for (const r of data.relations) {
    (outgoing.get(r.source) ?? outgoing.set(r.source, []).get(r.source)!).push(r);
    (incoming.get(r.destination) ?? incoming.set(r.destination, []).get(r.destination)!).push(r);
  }
  return {
    data,
    nodesById,
    nodesByUrl,
    typesById: new Map(data.nodeTypes.map((t) => [t.id, t])),
    relationTypesById: new Map(data.relationTypes.map((t) => [t.id, t])),
    outgoing,
    incoming,
  };
}

/** Linked nodes grouped by relation label. Incoming relations use the inverse label when defined. */
export function linkedNodes(index: GraphIndex, nodeId: string): { label: string; nodes: GraphNode[] }[] {
  const groups = new Map<string, GraphNode[]>();
  const push = (label: string, n: GraphNode | undefined) => {
    if (!n) return;
    (groups.get(label) ?? groups.set(label, []).get(label)!).push(n);
  };
  for (const r of index.outgoing.get(nodeId) ?? []) {
    const t = index.relationTypesById.get(r.type);
    push(t?.label ?? r.type, index.nodesById.get(r.destination));
  }
  for (const r of index.incoming.get(nodeId) ?? []) {
    const t = index.relationTypesById.get(r.type);
    const inverse = t ? index.data.relationTypes.find((x) => x.inverseOf === t.id) : undefined;
    push(inverse?.label ?? (t ? `${t.label} (incoming)` : r.type), index.nodesById.get(r.source));
  }
  return [...groups.entries()].map(([label, nodes]) => ({ label, nodes }));
}

const tokenize = (s: string) => s.toLowerCase().split(/[^a-z0-9%.@-]+/).filter(Boolean);

/** Cheap ranked search over titles; good enough for a few thousand nodes. */
export function searchNodes(index: GraphIndex, query: string, typeFilter: string | null, limit = 30): GraphNode[] {
  const q = query.trim().toLowerCase();
  const terms = tokenize(q);
  const pool = typeFilter ? index.data.nodes.filter((n) => n.type === typeFilter) : index.data.nodes;
  if (!terms.length) return pool.slice(0, limit);
  const scored: { n: GraphNode; s: number }[] = [];
  for (const n of pool) {
    const title = n.title.toLowerCase();
    const id = n.id.toLowerCase();
    let s = 0;
    if (title.includes(q) || id.includes(q)) s += 10;
    for (const t of terms) {
      if (title.includes(t)) s += 2;
      else if (id.includes(t)) s += 1;
      else if (n.tags.some((tag) => tag.toLowerCase().includes(t))) s += 0.5;
    }
    if (s > 0) scored.push({ n, s });
  }
  return scored.sort((a, b) => b.s - a.s || a.n.title.localeCompare(b.n.title)).slice(0, limit).map((x) => x.n);
}
