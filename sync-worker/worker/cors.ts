import { error, type IRequest } from "itty-router";

const parseAllowed = (env: Env): string[] =>
  (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const isAllowedOrigin = (origin: string | null, env: Env): boolean => {
  // No Origin header: same-origin or non-browser client (wrangler dev, curl). Allow.
  if (!origin) return true;
  return parseAllowed(env).some((allowed) =>
    allowed.startsWith("*.")
      ? origin.endsWith(allowed.slice(1)) && origin.startsWith("https://")
      : origin === allowed,
  );
};

const ALLOW_HEADERS = "Content-Type, Authorization";

export const enforceAllowedOrigin = (request: IRequest, env: Env): Response | void => {
  if (request.method === "OPTIONS") return;
  if (!isAllowedOrigin(request.headers.get("origin"), env)) return error(403, "Origin not allowed");
};

export const handlePreflight = (request: IRequest, env: Env): Response => {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin, env)) return error(403, "Origin not allowed");
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin ?? "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": ALLOW_HEADERS,
      "Access-Control-Max-Age": "86400",
    },
  });
};

export const withCors = (request: IRequest, response: Response, env: Env): Response => {
  // 101 (WebSocket upgrade) responses have immutable headers; skip them.
  if (response.status === 101) return response;
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(origin, env)) {
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  return response;
};
