/**
 * Orders data-access (server-only).
 * NetX's `netx_orders` is NOT in the Drizzle schema, so we read it via raw SQL
 * and link to a customer by email.
 */
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export type CustomerOrder = {
  id: number;
  orderNumber: string;
  total: number;
  status: string;
  date: string | null;
  itemCount: number;
  channel: string | null;
};

export async function getOrdersByEmail(email: string, limit = 50): Promise<CustomerOrder[]> {
  const [rows] = (await db.execute(sql`
    SELECT
      id,
      COALESCE(NULLIF(order_number, ''), CAST(id AS CHAR)) AS orderNumber,
      COALESCE(NULLIF(order_total, 0), total, 0) AS total,
      COALESCE(NULLIF(order_status, ''), status, 'unknown') AS status,
      COALESCE(ordered_at, order_date, created_at) AS date,
      COALESCE(item_count, 0) AS itemCount,
      COALESCE(NULLIF(marketplace_name, ''), channel, marketplace_type) AS channel
    FROM netx_orders
    WHERE customer_email = ${email}
    ORDER BY COALESCE(ordered_at, order_date, created_at) DESC
    LIMIT ${limit}
  `)) as unknown as [CustomerOrder[], unknown];

  return rows.map((r) => ({
    id: Number(r.id),
    orderNumber: String(r.orderNumber),
    total: Number(r.total),
    status: String(r.status),
    date: r.date ? new Date(r.date).toISOString() : null,
    itemCount: Number(r.itemCount),
    channel: r.channel ? String(r.channel) : null,
  }));
}
