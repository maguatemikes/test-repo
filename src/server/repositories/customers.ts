/**
 * Customers data-access layer (server-only).
 * Reusable CRUD — call from server components, server actions, route handlers.
 * Do NOT import into client components.
 */
import { and, count, desc, eq, gte, like, lt, lte, or, sql, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";

export type NewCustomer = typeof customers.$inferInsert;
export type Customer = typeof customers.$inferSelect;

export function getCustomers(orgId: number, limit = 200) {
  return db
    .select()
    .from(customers)
    .where(eq(customers.orgId, orgId))
    .orderBy(desc(customers.createdAt))
    .limit(limit);
}

/** Translate a behavioral tag label into a SQL condition over the stored metrics. */
function tagCondition(tag: string) {
  switch (tag) {
    case "VIP": return gte(customers.lifetimeSpend, "1000");
    case "High LTV": return and(gte(customers.lifetimeSpend, "500"), lt(customers.lifetimeSpend, "1000"));
    case "Loyal": return gte(customers.orderCount, 5);
    case "At Risk": return and(gte(customers.orderCount, 1), sql`${customers.lastOrderAt} < (NOW() - INTERVAL 60 DAY)`);
    case "New": return and(lte(customers.orderCount, 1), sql`${customers.lastOrderAt} >= (NOW() - INTERVAL 60 DAY)`);
    case "Has Refund": return gte(customers.refundCount, 1);
    default: return undefined;
  }
}

/** Server-side search + filters + pagination. Returns the page of rows and the total match count. */
export async function searchCustomers(
  orgId: number,
  opts: { q?: string; tag?: string; source?: string; channel?: string; limit?: number; offset?: number } = {},
): Promise<{ rows: Customer[]; total: number }> {
  const { q = "", tag = "", source = "", channel = "", limit = 100, offset = 0 } = opts;

  const conds = [eq(customers.orgId, orgId)];
  if (q) {
    const term = `%${q}%`;
    conds.push(
      or(
        like(customers.email, term),
        like(customers.displayName, term),
        like(customers.firstName, term),
        like(customers.lastName, term),
        like(customers.company, term),
      )!,
    );
  }
  if (source) conds.push(eq(customers.source, source));
  if (channel) conds.push(eq(customers.primaryChannel, channel));
  if (tag) {
    const tc = tagCondition(tag);
    if (tc) conds.push(tc);
  }
  const where = and(...conds);

  const [rows, totalRes] = await Promise.all([
    db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(customers).where(where),
  ]);

  return { rows, total: Number(totalRes[0]?.total ?? 0) };
}

/** Distinct channels present for an org (for the filter dropdown). */
export async function getChannels(orgId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ ch: customers.primaryChannel })
    .from(customers)
    .where(and(eq(customers.orgId, orgId), isNotNull(customers.primaryChannel)))
    .orderBy(customers.primaryChannel);
  return rows.map((r) => r.ch).filter((c): c is string => !!c);
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findCustomerByEmail(orgId: number, email: string): Promise<Customer | null> {
  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.orgId, orgId), eq(customers.email, email)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCustomer(data: NewCustomer): Promise<number> {
  const [res] = await db.insert(customers).values(data);
  return res.insertId;
}

export async function updateCustomer(id: number, data: Partial<NewCustomer>): Promise<void> {
  await db.update(customers).set({ ...data, updatedAt: new Date() }).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number): Promise<void> {
  await db.delete(customers).where(eq(customers.id, id));
}

/** Dedupe by (orgId, email): update if present, else insert. Returns the customer id. */
export async function upsertCustomerByEmail(
  orgId: number,
  email: string,
  data: Partial<NewCustomer> = {},
): Promise<number> {
  const existing = await findCustomerByEmail(orgId, email);
  if (existing) {
    await updateCustomer(existing.id, data);
    return existing.id;
  }
  return createCustomer({ orgId, email, ...data } as NewCustomer);
}
