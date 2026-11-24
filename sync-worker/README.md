# dg-tldraw-sync (Cloudflare Worker)

Hosts the real-time rooms for the canvas. Adapted from tldraw's `sync-cloudflare`
template (MIT): one Durable Object per room, room state in DO SQLite storage, image
uploads in R2. The only project-specific parts are `worker/schema.ts` (registers the
`discourse-node` shape so the server validates it) and `worker/cors.ts` (origin allowlist).

## One-time setup

1. Create a Cloudflare account and install Wrangler (already a dev dependency here):
   `npx wrangler login`
2. Create the R2 buckets named in `wrangler.toml`:
   `npx wrangler r2 bucket create dg-tldraw-assets` and
   `npx wrangler r2 bucket create dg-tldraw-assets-preview`
   (R2 needs to be enabled once in the dashboard; the free tier is enough.)
3. Edit `ALLOWED_ORIGINS` in `wrangler.toml` to include the deployed web app origin.
4. Deploy: `npm run worker:deploy` from the repo root. Wrangler prints the worker URL,
   e.g. `https://dg-tldraw-sync.<account>.workers.dev`.
5. Put that URL in the web app's `.env.local` as `NEXT_PUBLIC_SYNC_URL`.

Durable Objects with SQLite storage are available on the Workers free plan.

## Local development

`npm run worker:dev` serves the worker on `http://localhost:5172`. Point the web app at it
with `NEXT_PUBLIC_SYNC_URL=http://localhost:5172`. Without the variable the web app falls
back to browser-local persistence (no collaboration).

## Not done yet

- **Auth.** Any client that knows a room id can join and edit. Next step is a short-lived
  token minted by the web app (e.g. from a Supabase session) checked in `handleConnect`.
- Read-only sessions, per-room permissions.
