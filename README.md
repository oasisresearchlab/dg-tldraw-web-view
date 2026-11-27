# dg-tldraw-web-view

A standalone web app that puts a **discourse graph on a real-time collaborative tldraw
canvas**. It is the web analog of the canvas in the Roam
[Discourse Graph plugin](https://github.com/DiscourseGraphs/discourse-graph/tree/main/apps/roam/src/components/canvas),
without Roam: nodes are **imported** as JSON-LD, anyone with the canvas link can place them,
annotate around them with tldraw's normal tools, and open any node in a sidebar to read it.
Canvas state persists on the sync server. Nothing writes back to the source graph.

```
JSON-LD export  ──import──▶  web/public/graph.json (node store, read-only in the app)
                                     │
                                     ▼
   Next.js app (web/)  ◀──websocket──▶  Cloudflare Worker (sync-worker/): one Durable
   tldraw canvas + custom              Object per canvas, room state in SQLite,
   discourse-node shape + sidebar      images in R2
```

## Layout

| Path | What |
|---|---|
| `web/` | Next.js 16 app. `/` picks a canvas, `/c/<room>` is a canvas. tldraw 5.x. |
| `web/components/DiscourseNodeShapeUtil.tsx` | The custom shape: a card showing type, id, title; double-click or "Open" shows the node in the sidebar. |
| `web/components/NodeSidebar.tsx` | Renders the node's markdown, metadata, and linked nodes (with "place on canvas"). |
| `web/components/NodePalette.tsx` | Search box in tldraw's top panel to find and place nodes. Press `/`. |
| `shared/` | Shape props and migrations shared by client and server, plus the node store types. |
| `sync-worker/` | tldraw sync backend for Cloudflare. See its README for setup. |
| `schema/` | The JSON-LD import format and context. |
| `tools/export-lives.mjs` | Exports the Living Evidence Synthesis vault build to JSON-LD. |
| `tools/import-jsonld.mjs` | Builds the node store from one or more JSON-LD files. |
| `data/lives.jsonld` | Sample export: the LIVES graph (232 nodes, 784 relations). |

## Run it locally

```bash
npm install
npm run dev            # http://localhost:3000, browser-local persistence, no collaboration
```

To collaborate for real, deploy the worker (one-time, ~10 minutes, see
[`sync-worker/README.md`](./sync-worker/README.md)), then:

```bash
cp web/.env.example web/.env.local   # set NEXT_PUBLIC_SYNC_URL to the worker URL
npm run dev
```

Open the same `/c/<room>` link in two browsers.

## Deploy it

1. **Sync worker (Cloudflare).** Follow `sync-worker/README.md`: `wrangler login`, enable R2 in the
   dashboard, create the two buckets, `npm run worker:deploy`. Note the printed worker URL.
2. **Web app (Vercel).** Import the repo, set **Root Directory** to `web`, and add two environment
   variables: `NEXT_PUBLIC_SYNC_URL` (the worker URL) and `NEXT_PUBLIC_TLDRAW_LICENSE_KEY`
   (see below). Both are build-time, so changing them needs a redeploy.
3. **Allowlist the web origin.** Add the Vercel origin to `ALLOWED_ORIGINS` in
   `sync-worker/wrangler.toml` and deploy the worker again.

**tldraw license key.** The tldraw SDK runs without a key on localhost only. On any other host it
hides the editor after a few seconds unless a key is set (`data-testid="tl-license-expired"` in the
DOM is the tell). Research and side projects qualify for the free hobby license, which keeps the
"made with tldraw" watermark: apply at https://tldraw.dev/get-a-license/hobby with the deployed
domain, then put the key in `NEXT_PUBLIC_TLDRAW_LICENSE_KEY`.

## Bring your own graph

1. Produce JSON-LD in the format described in [`schema/README.md`](./schema/README.md).
   The Roam plugin's "JSON-LD (Experimental)" export works as-is. For an Obsidian vault
   built with the LIVES pipeline: `npm run export:lives -- path/to/graph-data.generated.json`.
2. `npm run import -- data/your-graph.jsonld` writes `web/public/graph.json`.
3. Redeploy the web app. Existing canvases keep working: shapes reference nodes by id and
   refresh title and color from the new store.

## Status

Milestone 1 (this repo): canvas route with live sync, discourse-node shape fed by an
import of the LIVES vault, sidebar, search palette, local fallback. Not yet done:

- **Relation arrows** as a typed binding (the plugin's `DiscourseRelationShape`). Plain
  tldraw arrows work today; typed relations with labels from the schema are next.
- **Auth** for the sync worker. Any client that knows a room id can edit.
- Import from the hosted app (upload a JSON-LD file) rather than at build time.
- Presence names from a login instead of tldraw's random defaults.

## License

MIT. The sync worker is adapted from tldraw's MIT-licensed template; the node shape is a
port of the Apache-2.0 Discourse Graph plugin canvas. The tldraw SDK itself needs a license
key on deployed hosts; the free hobby tier shows a "made with tldraw" watermark (see Deploy it).
