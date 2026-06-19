import { NextResponse } from "next/server";

/** Catch-all proxy → crm-api /api/automations[/{path}] — list/create, {id}, {id}/activate|pause|stats. */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

async function forward(req: Request, segments: string[]) {
  if (!API_BASE) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  if (segments.some((s) => s === ".." || s.includes("/"))) return NextResponse.json({ error: "Bad path" }, { status: 400 });
  const path = segments.length ? `automations/${segments.join("/")}` : "automations";
  const qs = new URL(req.url).search;
  const cookie = req.headers.get("cookie") || "";
  const method = req.method;
  const body = method === "POST" || method === "PATCH" || method === "PUT" ? await req.text() : undefined;
  const res = await fetch(`${API_BASE}/${path}${qs}`, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body });
  const text = await res.text();
  let data: unknown = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return NextResponse.json(data ?? { ok: res.ok }, { status: res.status });
}

type Ctx = { params: Promise<{ path?: string[] }> };
export async function GET(req: Request, { params }: Ctx) { return forward(req, (await params).path ?? []); }
export async function POST(req: Request, { params }: Ctx) { return forward(req, (await params).path ?? []); }
export async function PATCH(req: Request, { params }: Ctx) { return forward(req, (await params).path ?? []); }
export async function DELETE(req: Request, { params }: Ctx) { return forward(req, (await params).path ?? []); }
