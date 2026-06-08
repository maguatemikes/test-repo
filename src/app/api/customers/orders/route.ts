import { NextResponse } from "next/server";
import { getOrdersByEmail } from "@/server/repositories/orders";

export const dynamic = "force-dynamic";

// GET /api/customers/orders?email=...  → a customer's order history (from netx_orders)
export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email");
  if (!email) {
    return NextResponse.json({ ok: false, error: "email is required" }, { status: 400 });
  }
  try {
    const orders = await getOrdersByEmail(email);
    return NextResponse.json({ ok: true, count: orders.length, orders });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
