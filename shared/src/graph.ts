/** The node store produced by tools/import-jsonld.mjs (web/public/graph.json). */

export interface GraphNodeType {
  id: string;
  iri: string;
  label: string;
  /** dg_core base type IRI (Question, Claim, Evidence, Source) or null for extension types. */
  baseType: string | null;
  prefix: string;
  color: string;
  description: string;
}

export interface GraphRelationType {
  id: string;
  iri: string;
  label: string;
  inverseOf: string | null;
  domain: string[];
  range: string[];
  coreType: string | null;
}

export interface GraphNode {
  id: string;
  iri: string;
  url: string | null;
  type: string;
  title: string;
  content: string;
  created: string | null;
  modified: string | null;
  creator: string | null;
  status: string | null;
  tags: string[];
  extras: Record<string, unknown>;
}

export interface GraphRelation {
  id: string;
  type: string;
  source: string;
  destination: string;
}

export interface GraphSource {
  iri: string;
  title: string | null;
  generatedAt: string | null;
  file: string;
}

export interface GraphData {
  generatedAt: string;
  sources: GraphSource[];
  nodeTypes: GraphNodeType[];
  relationTypes: GraphRelationType[];
  nodes: GraphNode[];
  relations: GraphRelation[];
}
