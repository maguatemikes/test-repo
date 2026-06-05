/**
 * Lists data-access layer (server-only).
 * Static lists (crm_lists) with manual membership (crm_list_members).
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { lists, listMembers } from "@/lib/db/schema";

export type List = typeof lists.$inferSelect;

export function listLists(orgId: number) {
  return db.select().from(lists).where(eq(lists.orgId, orgId)).orderBy(desc(lists.createdAt));
}

export async function getListById(id: number): Promise<List | null> {
  const rows = await db.select().from(lists).where(eq(lists.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createList(
  orgId: number,
  name: string,
  opts: { description?: string; source?: string } = {},
): Promise<number> {
  const [res] = await db
    .insert(lists)
    .values({ orgId, name, description: opts.description, source: opts.source ?? "manual" });
  return res.insertId;
}

export async function addMember(listId: number, customerId: number): Promise<void> {
  try {
    await db.insert(listMembers).values({ listId, customerId });
    await db.update(lists).set({ memberCount: sql`${lists.memberCount} + 1` }).where(eq(lists.id, listId));
  } catch {
    /* already a member (composite PK) — no count change */
  }
}

export async function removeMember(listId: number, customerId: number): Promise<void> {
  await db
    .delete(listMembers)
    .where(and(eq(listMembers.listId, listId), eq(listMembers.customerId, customerId)));
  await db
    .update(lists)
    .set({ memberCount: sql`GREATEST(${lists.memberCount} - 1, 0)` })
    .where(eq(lists.id, listId));
}

export function getListMembers(listId: number) {
  return db.select().from(listMembers).where(eq(listMembers.listId, listId));
}
