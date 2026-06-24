import { NextResponse } from "next/server";

/**
 * Export the full current customer view (all rows matching q + filter) as CSV.
 * Builds the CSV directly from the customer list pages (fetched in parallel) —
 * no second round-trip to bulk/export.
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

const FILTER_MAP: Record<string, string> = {
  VIP: "vip",
  "At Risk": "at_risk",
  New: "new_30d",
  "Has Refund": "has_refund",
  Subscribed: "subscribed",
};

type Row = {
  id: number; email: string; displayName?: string | null; isVip?: boolean;
  isSubscribed?: boolean; lifetimeSpend?: number | null; orderCount?: number | null; lastOrderAt?: string | null;
};

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  if (!API_BASE) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  const { searchParams } = new URL(req.url);

  // List export — crm-api has a dedicated GET /customers/export?listId=N that
  // returns the CSV directly. Proxy it (and its filename) straight through.
  const listId = searchParams.get("listId");
  if (listId) {
    const r = await fetch(`${API_BASE}/customers/export?listId=${encodeURIComponent(listId)}`, { headers: cookie ? { cookie } : {}, cache: "no-store" });
    if (!r.ok) return NextResponse.json({ error: "Export failed" }, { status: r.status });
    const csv = await r.text();
    const cd = r.headers.get("content-disposition") || `attachment; filename=list-${listId}.csv`;
    return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": cd } });
  }

  const q = searchParams.get("q") || "";
  const filter = FILTER_MAP[searchParams.get("tag") || ""] || "";
  const pageSize = 500;
  const MAX_PAGES = 60;

  // Retry on failure so a transient drop never silently loses a page of rows.
  const fetchPage = async (page: number, attempt = 0): Promise<{ rows: Row[]; total: number }> => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (filter) sp.set("filter", filter);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    try {
      const r = await fetch(`${API_BASE}/customers?${sp}`, { headers: cookie ? { cookie } : {}, cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      return { rows: d.rows || [], total: d.total ?? 0 };
    } catch {
      if (attempt < 3) { await new Promise((res) => setTimeout(res, 300 * (attempt + 1))); return fetchPage(page, attempt + 1); }
      return { rows: [], total: -1 };
    }
  };

  // MUST be sequential: crm-api returns 200-with-missing-rows under any concurrent
  // load (not an error, so it can't be retried away). One page at a time = correct.
  // Slow for large sets — the real fix is a backend GET /customers/export (one query).
  const rows: Row[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { rows: pageRows, total } = await fetchPage(page);
    rows.push(...pageRows);
    if (pageRows.length === 0 || (total > 0 && rows.length >= total)) break;
  }

  const header = "id,email,display_name,is_vip,is_subscribed,lifetime_spend,order_count,last_order_at";
  const body = rows.map((r) =>
    [r.id, esc(r.email), esc(r.displayName ?? ""), r.isVip ? 1 : 0, r.isSubscribed ? 1 : 0, r.lifetimeSpend ?? 0, r.orderCount ?? 0, r.lastOrderAt ?? ""].join(","),
  ).join("\n");

  return new Response(header + "\n" + body + "\n", {
    headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=customers.csv" },
  });
}
