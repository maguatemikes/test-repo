import { NextResponse } from "next/server";

/** Catch-all proxy → crm-api /executions[/{id}] — per-run execution detail for
 *  the automation Executions tab. Read-only (GET). Mirrors the proxy pattern in
 *  src/app/api/automations/[[...path]]/route.ts (async params, path guard). */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

async function forward(req: Request, segments: string[]) {
  if (!API_BASE) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  if (segments.some((s) => s === ".." || s.includes("/"))) return NextResponse.json({ error: "Bad path" }, { status: 400 });
  const path = segments.length ? `executions/${segments.join("/")}` : "executions";
  const qs = new URL(req.url).search;
  const cookie = req.headers.get("cookie") || "";
  const res = await fetch(`${API_BASE}/${path}${qs}`, { headers: cookie ? { cookie } : {}, cache: "no-store" });
  const text = await res.text();
  let data: unknown = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return NextResponse.json(data ?? { ok: res.ok }, { status: res.status });
}

type Ctx = { params: Promise<{ path?: string[] }> };
export async function GET(req: Request, { params }: Ctx) { return forward(req, (await params).path ?? []); }
