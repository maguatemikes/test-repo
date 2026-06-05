/**
 * Customer tags data-access layer (server-only).
 * Tags are user-defined per organization (crm_customer_tags) and linked
 * to customers via crm_customer_tag_links.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customerTags, customerTagLinks } from "@/lib/db/schema";

export type Tag = typeof customerTags.$inferSelect;

export function listTags(orgId: number) {
  return db.select().from(customerTags).where(eq(customerTags.orgId, orgId)).orderBy(customerTags.name);
}

export async function getTagByName(orgId: number, name: string): Promise<Tag | null> {
  const rows = await db
    .select()
    .from(customerTags)
    .where(and(eq(customerTags.orgId, orgId), eq(customerTags.name, name)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createTag(orgId: number, name: string, color?: string): Promise<number> {
  const [res] = await db.insert(customerTags).values({ orgId, name, color });
  return res.insertId;
}

/** Get the tag id, creating it if it doesn't exist yet. */
export async function ensureTag(orgId: number, name: string, color?: string): Promise<number> {
  const existing = await getTagByName(orgId, name);
  return existing ? existing.id : createTag(orgId, name, color);
}

export async function deleteTag(id: number): Promise<void> {
  await db.delete(customerTags).where(eq(customerTags.id, id));
}

export function getTagsForCustomer(customerId: number) {
  return db
    .select({ id: customerTags.id, name: customerTags.name, color: customerTags.color })
    .from(customerTagLinks)
    .innerJoin(customerTags, eq(customerTagLinks.tagId, customerTags.id))
    .where(eq(customerTagLinks.customerId, customerId));
}

export async function assignTag(customerId: number, tagId: number): Promise<void> {
  // Composite PK makes a repeat link a duplicate-key error — treat as already linked.
  try {
    await db.insert(customerTagLinks).values({ customerId, tagId });
  } catch {
    /* already linked */
  }
}

export async function removeTag(customerId: number, tagId: number): Promise<void> {
  await db
    .delete(customerTagLinks)
    .where(and(eq(customerTagLinks.customerId, customerId), eq(customerTagLinks.tagId, tagId)));
}
