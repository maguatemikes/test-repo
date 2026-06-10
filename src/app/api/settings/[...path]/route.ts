import { NextResponse } from "next/server";

/**
 * Scoped catch-all proxy → crm-api for settings resources.
 * Forwards the caller's session cookie; only whitelisted top-level resources are allowed.
 *   org · api-keys · webhooks · integrations · sending-domains · audit-logs
 */
const API_BASE = process.env.NETX_API_BASE_URL;
const ALLOWED = new Set(["org", "api-keys", "webhooks", "integrations", "sending-domains", "audit-logs"]);

export const dynamic = "force-dynamic";

async function forward(req: Request, segments: string[]) {
  if (!API_BASE) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  if (!segments.length || !ALLOWED.has(segments[0])) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const path = segments.join("/");
  const cookie = req.headers.get("cookie") || "";
  const method = req.method;
  const body = method === "POST" || method === "PATCH" || method === "PUT" ? await req.text() : undefined;

  const res = await fetch(`${API_BASE}/${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body,
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return NextResponse.json(data ?? { ok: res.ok }, { status: res.status });
}

type Ctx = { params: Promise<{ path: string[] }> };
export async function GET(req: Request, { params }: Ctx) { return forward(req, (await params).path); }
export async function POST(req: Request, { params }: Ctx) { return forward(req, (await params).path); }
export async function PATCH(req: Request, { params }: Ctx) { return forward(req, (await params).path); }
export async function DELETE(req: Request, { params }: Ctx) { return forward(req, (await params).path); }
