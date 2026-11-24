#!/usr/bin/env node
// Import one or more Discourse Graph JSON-LD files into the node store the web app
// reads (web/public/graph.json). See schema/README.md.
//
//   node tools/import-jsonld.mjs <file.jsonld> [more.jsonld ...] [--out web/public/graph.json]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const inputs = [];
let out = path.join(here, "..", "web", "public", "graph.json");
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") out = args[++i];
  else inputs.push(args[i]);
}
if (!inputs.length) {
  console.error("usage: import-jsonld.mjs <file.jsonld> [...] [--out FILE]");
  process.exit(1);
}

const DGB = "https://discoursegraphs.com/schema/dg_base#";
const DG = "https://discoursegraphs.com/schema/dg_core#";
const KNOWN_TYPES = {
  nodeSchema: `${DGB}NodeSchema`,
  relationDef: `${DGB}RelationDef`,
  relationInstance: `${DGB}RelationInstance`,
};
const BASE_COLORS = {
  [`${DG}Question`]: "#856404",
  [`${DG}Claim`]: "#166534",
  [`${DG}Evidence`]: "#c0392b",
  [`${DG}Source`]: "#1e3a8a",
};
const FALLBACK_COLORS = ["#7f1d1d", "#b45309", "#0f766e", "#6d28d9", "#be185d", "#374151"];

function makeExpander(context) {
  const prefixes = {};
  for (const [k, v] of Object.entries(context ?? {})) {
    const iri = typeof v === "string" ? v : v?.["@id"];
    if (typeof iri === "string" && /[/#:]$/.test(iri)) prefixes[k] = iri;
  }
  // The Roam plugin writes dgb without a trailing '#'. Normalise to the ontology IRI.
  if (prefixes.dgb && !/[#/]$/.test(prefixes.dgb)) prefixes.dgb += "#";
  return (value) => {
    if (typeof value !== "string") return value;
    if (value in KNOWN_TYPES) return KNOWN_TYPES[value];
    const m = /^([A-Za-z][\w-]*):(.*)$/.exec(value);
    if (m && prefixes[m[1]] !== undefined) return prefixes[m[1]] + m[2];
    if (m && !["http", "https", "urn", "mailto"].includes(m[1]) && context?.[m[1]]) {
      const base = typeof context[m[1]] === "string" ? context[m[1]] : context[m[1]]["@id"];
      return base + m[2];
    }
    return value;
  };
}

const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const lastSegment = (iri) => {
  const s = String(iri);
  const hash = s.lastIndexOf("#");
  const tail = hash >= 0 && hash < s.length - 1 ? s.slice(hash + 1) : s;
  return tail.replace(/\/+$/, "").split("/").pop() || s;
};

const nodeTypes = new Map(); // iri -> type
const relationTypes = new Map(); // iri -> type
const nodes = new Map(); // iri -> node
const relations = []; // raw, iris
const sources = [];

for (const file of inputs) {
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  const expand = makeExpander(doc["@context"]);
  sources.push({ iri: doc["@id"] ?? path.basename(file), title: doc["dct:title"] ?? doc.title ?? null, generatedAt: doc["prov:generatedAtTime"] ?? null, file: path.basename(file) });
  const items = asList(doc["@graph"]);

  // Pass 1: schema records
  for (const it of items) {
    const types = asList(it["@type"]).map(expand);
    const id = expand(it["@id"]);
    if (types.includes(KNOWN_TYPES.nodeSchema)) {
      nodeTypes.set(id, {
        iri: id,
        label: it.label ?? lastSegment(id),
        baseType: it.subClassOf ? expand(asList(it.subClassOf)[0]) : null,
        prefix: it.prefix ?? null,
        color: it.color ?? null,
        description: typeof it.content === "string" ? it.content : "",
      });
    } else if (types.includes(KNOWN_TYPES.relationDef)) {
      relationTypes.set(id, {
        iri: id,
        label: it.label ?? lastSegment(id),
        inverseOf: it.inverseOf ? expand(it.inverseOf) : null,
        domain: asList(it.domain).map(expand),
        range: asList(it.range).map(expand),
        coreType: it.subPropertyOf ? expand(asList(it.subPropertyOf)[0]) : null,
      });
    }
  }
  // Pass 2: instances
  for (const it of items) {
    const types = asList(it["@type"]).map(expand);
    const id = expand(it["@id"]);
    if (types.includes(KNOWN_TYPES.nodeSchema) || types.includes(KNOWN_TYPES.relationDef)) continue;
    if (types.includes(KNOWN_TYPES.relationInstance)) {
      relations.push({ iri: id ?? null, predicate: expand(it.predicate), source: expand(it.source), destination: expand(it.destination) });
      continue;
    }
    const typeIri = types.find((t) => nodeTypes.has(t)) ?? types[0];
    if (!typeIri) continue;
    if (!nodeTypes.has(typeIri)) {
      nodeTypes.set(typeIri, { iri: typeIri, label: lastSegment(typeIri), baseType: null, prefix: null, color: null, description: "" });
    }
    const known = new Set(["@id", "@type", "title", "label", "content", "created", "modified", "creator", "tags", "extras", "status"]);
    const extras = { ...(typeof it.extras === "object" && it.extras ? it.extras : {}) };
    for (const [k, v] of Object.entries(it)) if (!known.has(k)) extras[k] = v;
    nodes.set(id, {
      iri: id,
      typeIri,
      title: it.title ?? it.label ?? lastSegment(id),
      content: typeof it.content === "string" ? it.content : "",
      created: it.created ?? null,
      modified: it.modified ?? null,
      creator: it.creator ?? null,
      status: it.status ?? null,
      tags: asList(it.tags),
      extras,
    });
  }
}

// Short ids: last segment when unique, else full IRI.
function shortIds(map) {
  const counts = new Map();
  for (const iri of map.keys()) { const s = lastSegment(iri); counts.set(s, (counts.get(s) ?? 0) + 1); }
  const ids = new Map();
  for (const iri of map.keys()) { const s = lastSegment(iri); ids.set(iri, counts.get(s) === 1 ? s : iri); }
  return ids;
}
const nodeIds = shortIds(nodes);
const typeIds = shortIds(nodeTypes);
const relTypeIds = shortIds(relationTypes);

let fallbackIdx = 0;
const outTypes = [...nodeTypes.values()].map((t) => ({
  id: typeIds.get(t.iri),
  iri: t.iri,
  label: t.label,
  baseType: t.baseType,
  prefix: t.prefix ?? t.label.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 4),
  color: t.color ?? (t.baseType && BASE_COLORS[t.baseType]) ?? FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length],
  description: t.description,
}));
const outRelTypes = [...relationTypes.values()].map((r) => ({
  id: relTypeIds.get(r.iri),
  iri: r.iri,
  label: r.label,
  inverseOf: r.inverseOf ? relTypeIds.get(r.inverseOf) ?? r.inverseOf : null,
  domain: r.domain.map((d) => typeIds.get(d) ?? d),
  range: r.range.map((d) => typeIds.get(d) ?? d),
  coreType: r.coreType,
}));
const outNodes = [...nodes.values()].map((n) => ({
  id: nodeIds.get(n.iri),
  iri: n.iri,
  url: /^https?:\/\//.test(n.iri) ? n.iri : null,
  type: typeIds.get(n.typeIri),
  title: n.title,
  content: n.content,
  created: n.created,
  modified: n.modified,
  creator: n.creator,
  status: n.status,
  tags: n.tags,
  extras: n.extras,
}));
const seenRel = new Set();
const outRelations = [];
let dropped = 0;
for (const r of relations) {
  const type = relTypeIds.get(r.predicate) ?? r.predicate;
  const source = nodeIds.get(r.source), destination = nodeIds.get(r.destination);
  if (!source || !destination) { dropped++; continue; }
  const id = r.iri ? lastSegment(r.iri) === r.iri ? r.iri : `${type}/${source}/${destination}` : `${type}/${source}/${destination}`;
  if (seenRel.has(id)) continue;
  seenRel.add(id);
  outRelations.push({ id, type, source, destination });
}

const result = { generatedAt: new Date().toISOString(), sources, nodeTypes: outTypes, relationTypes: outRelTypes, nodes: outNodes, relations: outRelations };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}: ${outTypes.length} node types, ${outRelTypes.length} relation types, ${outNodes.length} nodes, ${outRelations.length} relations${dropped ? ` (${dropped} relations dropped: unknown endpoint)` : ""}`);
