#!/usr/bin/env node
// Export a Living Evidence Synthesis build (lib/graph-data.generated.json) to
// Discourse Graph JSON-LD. See schema/README.md for the format.
//
//   node tools/export-lives.mjs <path/to/graph-data.generated.json> \
//     [--site https://living-evidence-synthesis.vercel.app] [--out data/lives.jsonld]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
if (!input) {
  console.error("usage: export-lives.mjs <graph-data.generated.json> [--site URL] [--out FILE]");
  process.exit(1);
}
const site = opt("site", "https://living-evidence-synthesis.vercel.app").replace(/\/+$/, "");
const out = opt("out", path.join(here, "..", "data", "lives.jsonld"));
const LIVES_NS = "https://github.com/cdromcom/living-evidence-synthesis#";

const graph = JSON.parse(fs.readFileSync(input, "utf8"));
const baseContext = JSON.parse(fs.readFileSync(path.join(here, "..", "schema", "context.jsonld"), "utf8"))["@context"];

// --- node types -----------------------------------------------------------
const TYPE_META = {
  QUE: { label: "Question", base: "dg:Question", color: "#856404" },
  CLM: { label: "Claim", base: "dg:Claim", color: "#166534" },
  EVD: { label: "Evidence", base: "dg:Evidence", color: "#c0392b" },
  CVT: { label: "Caveat", base: null, color: "#b45309" },
  SRC: { label: "Source", base: "dg:Source", color: "#1e3a8a" },
  EP: { label: "Evidence Pattern", base: null, color: "#7f1d1d" },
};
const TYPE_DESCRIPTION = {
  QUE: "A research question the synthesis is trying to answer.",
  CLM: "An atomic, generalized assertion that answers a question; grounded in evidence.",
  EVD: "A specific empirical observation from one source, with its appraisal.",
  CVT: "A limitation or qualification that bounds how far an evidence node or claim can be trusted.",
  SRC: "A paper or other research material from which evidence is derived, with trust signals.",
  EP: "A cross-paper regularity: a pattern several evidence nodes instantiate.",
};

// --- relation types -------------------------------------------------------
const REL_META = {
  addresses: { label: "Addresses", inverse: "Addressed by", core: "dg:addresses" },
  supports: { label: "Supports", inverse: "Supported by", core: "dg:supportsCE" },
  qualifies: { label: "Qualifies", inverse: "Qualified by" },
  derivedFrom: { label: "Derived from", inverse: "Yields" },
  instantiates: { label: "Instantiates", inverse: "Instantiated by" },
  relatesTo: { label: "Relates to", inverse: "Related to" },
  mentions: { label: "Mentions", inverse: "Mentioned in" },
};

const typesSeen = new Set(graph.nodes.map((n) => n.type));
const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

const nodeSchemas = [...typesSeen].map((t) => {
  const m = TYPE_META[t] ?? { label: graph.nodes.find((n) => n.type === t)?.typeLabel ?? t, base: null, color: null };
  const rec = {
    "@id": `lives:${t}`,
    "@type": "nodeSchema",
    label: m.label,
    prefix: t,
    content: TYPE_DESCRIPTION[t] ?? "",
  };
  if (m.base) rec.subClassOf = m.base;
  if (m.color) rec.color = m.color;
  return rec;
});

// domain/range observed from the edges
const relDomRan = new Map();
for (const e of graph.edges) {
  const from = nodeById.get(e.from), to = nodeById.get(e.to);
  if (!from || !to) continue;
  const d = relDomRan.get(e.type) ?? { domain: new Set(), range: new Set() };
  d.domain.add(from.type); d.range.add(to.type);
  relDomRan.set(e.type, d);
}
const relationDefs = [];
for (const [type, dr] of relDomRan) {
  const m = REL_META[type] ?? { label: type, inverse: `${type} (inverse)` };
  const def = {
    "@id": `lives:rel/${type}`,
    "@type": "relationDef",
    label: m.label,
    domain: [...dr.domain].map((t) => `lives:${t}`),
    range: [...dr.range].map((t) => `lives:${t}`),
  };
  if (m.core) def.subPropertyOf = m.core;
  relationDefs.push(def, {
    "@id": `lives:rel/${type}-inverse`,
    "@type": "relationDef",
    label: m.inverse,
    domain: def.range,
    range: def.domain,
    inverseOf: def["@id"],
  });
}

// --- instances -------------------------------------------------------------
const rewriteLinks = (md) =>
  md
    .replace(/\]\(\/nodes\/([^)\s]+)\)/g, `](${site}/nodes/$1)`)
    .replace(/\]\(\/vault-img\//g, `](${site}/vault-img/`)
    .replace(/src="\/vault-img\//g, `src="${site}/vault-img/`);

const nodes = graph.nodes.map((n) => {
  const rec = {
    "@id": `pages:${n.id}`,
    "@type": `lives:${n.type}`,
    title: n.title,
    content: rewriteLinks(n.bodyMarkdown ?? ""),
  };
  if (n.created) rec.created = n.created;
  if (n.updated) rec.modified = n.updated;
  if (n.curationStatus) rec.status = n.curationStatus;
  if (n.tags?.length) rec.tags = n.tags;
  const extras = { ...(n.extras ?? {}) };
  if (n.filename) extras.filename = n.filename;
  if (Object.keys(extras).length) rec.extras = extras;
  return rec;
});

const relations = graph.edges
  .filter((e) => nodeById.has(e.from) && nodeById.has(e.to))
  .map((e) => ({
    "@id": `lives:rel/${e.type}/${e.from}/${e.to}`,
    "@type": "relationInstance",
    predicate: `lives:rel/${e.type}`,
    source: `pages:${e.from}`,
    destination: `pages:${e.to}`,
  }));

const doc = {
  "@context": { ...baseContext, lives: LIVES_NS, pages: `${site}/nodes/` },
  "@id": site,
  "dct:title": "Living Evidence Synthesis (LIVES)",
  "prov:generatedAtTime": new Date().toISOString(),
  "@graph": [...nodeSchemas, ...relationDefs, ...nodes, ...relations],
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(doc, null, 2));
console.log(`wrote ${out}: ${nodeSchemas.length} node types, ${relationDefs.length} relation defs, ${nodes.length} nodes, ${relations.length} relations`);
