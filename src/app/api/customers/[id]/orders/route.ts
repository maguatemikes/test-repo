import { NextResponse } from "next/server";

/**
 * Proxy → crm-api GET /api/customers/{id}/orders.
 * Forwards the caller's session cookie; maps PascalCase rows → the drawer's shape.
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!API_BASE) return NextResponse.json({ ok: false, orders: [] }, { status: 503 });

  try {
    const cookie = req.headers.get("cookie") || "";
    const res = await fetch(`${API_BASE}/customers/${encodeURIComponent(id)}/orders?pageSize=50`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ ok: false, orders: [] }, { status: res.status });

    const data = await res.json();
    const orders = (data.rows || []).map((o: Record<string, unknown>) => ({
      id: o.Id,
      orderNumber: o.OrderNumber,
      total: o.Total,
      status: o.Status,
      date: o.Date,
      itemCount: o.ItemCount,
      channel: o.MarketplaceName || o.Channel,
    }));
    return NextResponse.json({ ok: true, orders, total: data.total });
  } catch {
    return NextResponse.json({ ok: false, orders: [] }, { status: 502 });
  }
}
