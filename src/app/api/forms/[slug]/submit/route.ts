import { NextResponse } from "next/server";

/** Public form submission → crm-api POST /api/public/forms/{slug}/submit (no DB, no auth). */
const API_BASE = process.env.NETX_API_BASE_URL;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!API_BASE) return NextResponse.json({ ok: false, error: "Forms service not configured" }, { status: 503, headers: CORS });

  try {
    const body = await req.json();
    const res = await fetch(`${API_BASE}/public/forms/${encodeURIComponent(slug)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, ...data }, { status: res.ok ? 201 : res.status, headers: CORS });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502, headers: CORS });
  }
}
