import { NextRequest } from "next/server";

/** Proxy → crm-api /ai/complete (AI text completion for the content editor).
 *  The OpenRouter key lives only in crm-api — the browser only ever talks to
 *  this route, never the provider. The upstream response (an SSE stream of
 *  deltas) is passed straight through unbuffered so the editor receives tokens
 *  as they arrive. Mirrors the proxy pattern in src/app/api/forms/route.ts. */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!API_BASE) return new Response("AI service not configured", { status: 503 });

  const upstream = await fetch(`${API_BASE}/ai/complete`, {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") ?? "application/json",
      cookie: req.headers.get("cookie") ?? "", // forward session so crm-api [Authorize] sees the user
    },
    body: await req.text(),
    cache: "no-store",
  });

  // Stream the body through as-is; keep SSE frames unbuffered end to end.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
    },
  });
}
