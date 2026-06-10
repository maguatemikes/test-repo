import { NextResponse } from "next/server";

/**
 * Proxy → crm-api POST /api/customers/bulk/{action}.
 *   tag      { ids[], tagId } → { ok }
 *   suppress { ids[] }        → { ok }
 *   export   { ids[] }        → CSV download
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["tag", "suppress", "export"]);

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!ALLOWED.has(action)) return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 404 });
  if (!API_BASE) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });

  const cookie = req.headers.get("cookie") || "";
  const body = await req.text();
  const res = await fetch(`${API_BASE}/customers/bulk/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body,
  });

  if (action === "export") {
    const csv = await res.text();
    if (!res.ok) return NextResponse.json({ ok: false, error: "Export failed" }, { status: res.status });
    return new Response(csv, {
      status: 200,
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=customers.csv" },
    });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(res.ok ? { ok: true, ...data } : { ok: false, error: data.message || "Failed", ...data }, { status: res.status });
}
