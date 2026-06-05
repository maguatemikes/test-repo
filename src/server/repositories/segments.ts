/**
 * Segments data-access layer (server-only).
 * Dynamic, rule-based audiences (crm_segments). Membership is materialized
 * into crm_segment_members by the segment engine (not part of basic CRUD).
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { segments } from "@/lib/db/schema";

export type Segment = typeof segments.$inferSelect;

export function listSegments(orgId: number) {
  return db.select().from(segments).where(eq(segments.orgId, orgId)).orderBy(desc(segments.createdAt));
}

export async function getSegmentById(id: number): Promise<Segment | null> {
  const rows = await db.select().from(segments).where(eq(segments.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createSegment(
  orgId: number,
  name: string,
  ruleDefinition: unknown,
  description?: string,
): Promise<number> {
  const [res] = await db.insert(segments).values({ orgId, name, ruleDefinition, description });
  return res.insertId;
}

export async function updateSegment(
  id: number,
  data: { name?: string; description?: string; ruleDefinition?: unknown },
): Promise<void> {
  await db.update(segments).set({ ...data, updatedAt: new Date() }).where(eq(segments.id, id));
}

export async function deleteSegment(id: number): Promise<void> {
  await db.delete(segments).where(eq(segments.id, id));
}
