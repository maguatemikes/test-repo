import { NextResponse } from "next/server";

/** Catch-all proxy → crm-api /api/campaigns/{path} — {id}, {id}/test, {id}/send, {id}/analytics. */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

async function forward(req: Request, segments: string[]) {
  if (!API_BASE) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const path = `campaigns/${segments.join("/")}`;
  const cookie = req.headers.get("cookie") || "";
  const method = req.method;
  const body = method === "POST" || method === "PATCH" || method === "PUT" ? await req.text() : undefined;
  const res = await fetch(`${API_BASE}/${path}`, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body });
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
