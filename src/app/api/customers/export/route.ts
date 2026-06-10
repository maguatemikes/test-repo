import { NextResponse } from "next/server";

/**
 * Export the full current customer view (all rows matching q + filter) as CSV.
 * Collects every matching id from crm-api, then hands them to bulk/export.
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

// Same chip-label → crm-api filter mapping as the customers page.
const FILTER_MAP: Record<string, string> = {
  VIP: "vip",
  "At Risk": "at_risk",
  New: "new_30d",
  "Has Refund": "has_refund",
  Subscribed: "subscribed",
};

export async function GET(req: Request) {
  if (!API_BASE) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const filter = FILTER_MAP[searchParams.get("tag") || ""] || "";

  // Collect every matching id (paginate, with a safety cap).
  const ids: number[] = [];
  const pageSize = 500;
  for (let page = 1; page <= 60; page++) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (filter) sp.set("filter", filter);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    const r = await fetch(`${API_BASE}/customers?${sp}`, { headers: cookie ? { cookie } : {}, cache: "no-store" });
    if (!r.ok) break;
    const d = await r.json();
    const rows: { id: number }[] = d.rows || [];
    for (const row of rows) ids.push(row.id);
    const total = d.total ?? ids.length;
    if (rows.length === 0 || ids.length >= total) break;
  }

  if (ids.length === 0) {
    return new Response("id,email\n", { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=customers.csv" } });
  }

  const exp = await fetch(`${API_BASE}/customers/bulk/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ ids }),
  });
  if (!exp.ok) return NextResponse.json({ error: "Export failed" }, { status: exp.status });
  const csv = await exp.text();
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=customers.csv" } });
}
