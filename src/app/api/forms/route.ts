import { NextResponse } from "next/server";

/** Proxy → crm-api /api/forms. GET = list forms (id, name, slug) for pickers
 *  (e.g. the automation "Form submitted" trigger's form selector). */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false, forms: [] }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  try {
    const res = await fetch(`${API_BASE}/forms`, { headers: cookie ? { cookie } : {}, cache: "no-store" });
    if (!res.ok) return NextResponse.json({ ok: false, forms: [] }, { status: res.status });
    const d = await res.json();
    const forms = (d.rows || []).map((f: Record<string, unknown>) => ({ id: f.id, name: f.name, slug: f.slug }));
    return NextResponse.json({ ok: true, forms });
  } catch {
    return NextResponse.json({ ok: false, forms: [] }, { status: 502 });
  }
}
