/**
 * Lists data-access layer (server-only).
 * Static lists (crm_lists) with manual membership (crm_list_members).
 */
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { lists, listMembers, customers } from "@/lib/db/schema";

export type List = typeof lists.$inferSelect;

export function listLists(orgId: number) {
  return db.select().from(lists).where(eq(lists.orgId, orgId)).orderBy(desc(lists.createdAt));
}

/** Lists with a live member count (computed, not the denormalized column). */
export function listListsWithCounts(orgId: number) {
  return db
    .select({
      id: lists.id, name: lists.name, description: lists.description, source: lists.source,
      createdAt: lists.createdAt,
      count: count(listMembers.customerId),
    })
    .from(lists)
    .leftJoin(listMembers, eq(listMembers.listId, lists.id))
    .where(eq(lists.orgId, orgId))
    .groupBy(lists.id)
    .orderBy(desc(lists.createdAt));
}

/** A list's members joined to customer details. */
export function getListMembersDetailed(listId: number, limit = 200) {
  return db
    .select({
      id: customers.id, email: customers.email, displayName: customers.displayName,
      firstName: customers.firstName, lastName: customers.lastName,
      source: customers.source, addedAt: listMembers.addedAt,
    })
    .from(listMembers)
    .innerJoin(customers, eq(customers.id, listMembers.customerId))
    .where(eq(listMembers.listId, listId))
    .orderBy(desc(listMembers.addedAt))
    .limit(limit);
}

/** Delete a list and its membership rows. */
export async function deleteList(id: number): Promise<void> {
  await db.delete(listMembers).where(eq(listMembers.listId, id));
  await db.delete(lists).where(eq(lists.id, id));
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
