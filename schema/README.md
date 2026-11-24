# Import format: Discourse Graph JSON-LD

The web view imports discourse graphs as **JSON-LD** using the vocabulary from the
[DiscourseGraphs/schemas](https://github.com/DiscourseGraphs/schemas) repo
(`dgb:` base ontology, `dg:` core node and relation types). It is a superset of the
"JSON-LD (Experimental)" export in the Roam Discourse Graph plugin
(`apps/roam/src/utils/jsonld.ts`), so a plugin export imports as-is.

One file carries both the **schema** (node types, relation types) and the **instances**
(nodes, relations). The canvas UI is driven by the schema: node colors, type labels, and
the relation palette all come from the file, nothing is hard-coded to Question/Claim/Evidence.

```jsonc
{
  "@context": { /* see context.jsonld; may add "pages": "<base url for node ids>" */ },
  "@id": "https://example.org/my-graph",
  "prov:generatedAtTime": "2026-11-24T00:00:00Z",
  "@graph": [
    // --- schema ---
    { "@id": "pages:CLM", "@type": "nodeSchema", "label": "Claim",
      "subClassOf": "dg:Claim", "prefix": "CLM", "color": "#166534", "content": "…" },
    { "@id": "pages:rel/supports", "@type": "relationDef", "label": "Supports",
      "domain": ["pages:EVD"], "range": ["pages:CLM"], "subPropertyOf": "dg:supportsCE" },
    { "@id": "pages:rel/supports-inverse", "@type": "relationDef", "label": "Supported by",
      "inverseOf": "pages:rel/supports" },

    // --- instances ---
    { "@id": "pages:CLM-001", "@type": "pages:CLM", "title": "…", "content": "markdown…",
      "created": "…", "modified": "…", "creator": "…", "tags": ["…"], "extras": { "any": "json" } },
    { "@id": "pages:rel/supports/EVD-001/CLM-001", "@type": "relationInstance",
      "predicate": "pages:rel/supports", "source": "pages:EVD-001", "destination": "pages:CLM-001" }
  ]
}
```

## Rules the importer follows

- **Node schema** (`@type: nodeSchema`): `label` is required. `subClassOf` points at a
  `dg:` core type when one applies (Question, Claim, Evidence, Source); extension types
  such as an Evidence Pattern may omit it. `color` (CSS color) and `prefix` (short code
  shown on the canvas) are optional; the importer picks defaults from the base type.
- **Relation definitions** (`@type: relationDef`): `label` required. `inverseOf` marks
  the inverse direction. `domain` and `range` may be a single id or a list.
- **Node instances**: `@type` is the id of a node schema. `content` is markdown. Links
  inside `content` whose href equals another node's `@id` (or its expanded IRI) are turned
  into in-app links that open that node in the sidebar.
- **Relation instances**: `predicate`, `source`, `destination` are node or relation ids.
  `@id` is optional (the plugin export omits it); the importer derives a stable one.
- **Ids**: the importer uses the last path segment of a node IRI as its short id when
  that is unique within the file (`pages:CLM-001` becomes `CLM-001`), otherwise the full IRI.
- **Compatibility**: the Roam plugin export writes the `dgb:` prefix without a trailing
  `#`. Both spellings are accepted.
- Unknown keys are preserved under `extras` and shown in the sidebar's metadata section.

## Producers

| Source | Tool |
|---|---|
| Roam Discourse Graph plugin | Export → "JSON-LD (Experimental)" |
| Living Evidence Synthesis vault (Obsidian, built to `graph-data.generated.json`) | `node tools/export-lives.mjs <graph-data.generated.json>` |
| Anything else | Write the shape above; see `context.jsonld` |

Then run `node tools/import-jsonld.mjs <file.jsonld> [more.jsonld…]` to build
`web/public/graph.json`, the node store the app reads.
