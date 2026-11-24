import { handleUnfurlRequest } from "cloudflare-workers-unfurl";
import { AutoRouter, error, type IRequest } from "itty-router";
import { handleAssetDownload, handleAssetUpload } from "./assetUploads";
import { enforceAllowedOrigin, handlePreflight, withCors } from "./cors";

// make sure our sync durable object is made available to cloudflare
export { TldrawDurableObject } from "./TldrawDurableObject";

const router = AutoRouter<IRequest, [env: Env, ctx: ExecutionContext]>({
  before: [enforceAllowedOrigin],
  catch: (e) => {
    console.error(e);
    return error(e);
  },
  finally: [(response: Response, request: IRequest, env: Env) => withCors(request, response, env)],
})
  .options("*", handlePreflight)
  .get("/", () => ({ ok: true, service: "dg-tldraw-sync" }))

  // requests to /api/connect/:roomId are routed to the Durable Object, which handles realtime websocket syncing
  .get("/api/connect/:roomId", (request, env) => {
    const id = env.TLDRAW_DURABLE_OBJECT.idFromName(request.params.roomId);
    const room = env.TLDRAW_DURABLE_OBJECT.get(id);
    return room.fetch(request.url, { headers: request.headers, body: request.body });
  })

  // assets (images, video) are uploaded to and served from the R2 bucket
  .post("/api/uploads/:uploadId", handleAssetUpload)
  .get("/api/uploads/:uploadId", handleAssetDownload)

  // bookmarks need to extract metadata from pasted URLs
  .get("/api/unfurl", handleUnfurlRequest)
  .all("*", () => new Response("Not found", { status: 404 }));

export default {
  fetch: router.fetch,
};
