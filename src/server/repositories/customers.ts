/**
 * Customers data-access layer (server-only).
 * Reusable CRUD — call from server components, server actions, route handlers.
 * Do NOT import into client components.
 */
import { and, count, desc, eq, like, or } from "drizzle-orm";
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

/** Server-side search + pagination. Returns the page of rows and the total match count. */
export async function searchCustomers(
  orgId: number,
  opts: { q?: string; limit?: number; offset?: number } = {},
): Promise<{ rows: Customer[]; total: number }> {
  const { q = "", limit = 100, offset = 0 } = opts;
  const term = `%${q}%`;
  const where = q
    ? and(
        eq(customers.orgId, orgId),
        or(
          like(customers.email, term),
          like(customers.displayName, term),
          like(customers.firstName, term),
          like(customers.lastName, term),
          like(customers.company, term),
        ),
      )
    : eq(customers.orgId, orgId);

  const [rows, totalRes] = await Promise.all([
    db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(customers).where(where),
  ]);

  return { rows, total: Number(totalRes[0]?.total ?? 0) };
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
