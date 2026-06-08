/**
 * Segments data-access (server-only).
 * Segments are rule-based audiences. Rules are evaluated ON-THE-FLY against
 * crm_customers (read-only) — no membership is materialized.
 */
import { and, count, desc, eq, ne, gt, gte, lt, lte, or, sql, type SQL, type AnyColumn } from "drizzle-orm";
import { db } from "@/lib/db";
import { segments, customers } from "@/lib/db/schema";

export type Segment = typeof segments.$inferSelect;

// ---------- rule model ----------
export type Rule = { field: string; op: string; value: string | number };
export type RuleGroup = { op: "AND" | "OR"; rules: (Rule | RuleGroup)[] };

const FIELD: Record<string, AnyColumn> = {
  lifetime_spend: customers.lifetimeSpend,
  order_count: customers.orderCount,
  last_order_at: customers.lastOrderAt,
  created_at: customers.createdAt,
  source: customers.source,
  primary_channel: customers.primaryChannel,
  is_subscribed: customers.isSubscribed,
};

/** Translate a rule (or group) into a SQL condition over crm_customers. */
function ruleToCondition(node: Rule | RuleGroup): SQL | undefined {
  if ("rules" in node) {
    const parts = node.rules.map(ruleToCondition).filter(Boolean) as SQL[];
    if (!parts.length) return undefined;
    return node.op === "OR" ? or(...parts) : and(...parts);
  }
  const col = FIELD[node.field];
  if (!col) return undefined;
  switch (node.op) {
    case "gt": return gt(col, node.value as never);
    case "gte": return gte(col, node.value as never);
    case "lt": return lt(col, node.value as never);
    case "lte": return lte(col, node.value as never);
    case "eq": return eq(col, node.value as never);
    case "ne": return ne(col, node.value as never);
    case "within_days": return sql`${col} >= (NOW() - INTERVAL ${Number(node.value)} DAY)`;
    case "older_than_days": return sql`${col} < (NOW() - INTERVAL ${Number(node.value)} DAY)`;
    default: return undefined;
  }
}

// ---------- human-readable rule display ----------
const FIELD_LABEL: Record<string, string> = {
  lifetime_spend: "Lifetime Spend", order_count: "Total Orders", last_order_at: "Last Order",
  created_at: "Created", source: "Source", primary_channel: "Channel",
  is_subscribed: "Subscribed", last_engagement_at: "Last Engagement",
};
const OP_LABEL: Record<string, string> = { gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "is", ne: "is not" };

function ruleLine(r: Rule): string {
  const f = FIELD_LABEL[r.field] ?? r.field;
  if (r.op === "within_days") return `${f} within ${r.value} days`;
  if (r.op === "older_than_days") return `${f} older than ${r.value} days`;
  const v = r.field === "lifetime_spend" ? `$${Number(r.value).toLocaleString()}` : r.value;
  return `${f} ${OP_LABEL[r.op] ?? r.op} ${v}`;
}

/** Turn a stored rule tree into display strings (subsequent OR rows get an "OR: " prefix). */
export function ruleToDisplay(group: RuleGroup): string[] {
  const out: string[] = [];
  (group.rules || []).forEach((node, i) => {
    const text = "rules" in node ? "(group)" : ruleLine(node);
    out.push(i > 0 && group.op === "OR" ? `OR: ${text}` : text);
  });
  return out.length ? out : ["All contacts"];
}

/** Live count of customers matching a rule. */
export async function countByRule(orgId: number, rule: RuleGroup): Promise<number> {
  const cond = ruleToCondition(rule);
  const where = cond ? and(eq(customers.orgId, orgId), cond) : eq(customers.orgId, orgId);
  const res = await db.select({ total: count() }).from(customers).where(where);
  return Number(res[0]?.total ?? 0);
}

/** Live sample of customers matching a rule (for the member preview). */
export async function sampleByRule(orgId: number, rule: RuleGroup, limit = 20) {
  const cond = ruleToCondition(rule);
  const where = cond ? and(eq(customers.orgId, orgId), cond) : eq(customers.orgId, orgId);
  const rows = await db
    .select({
      id: customers.id, email: customers.email, displayName: customers.displayName,
      firstName: customers.firstName, lastName: customers.lastName,
      lifetimeSpend: customers.lifetimeSpend, lastOrderAt: customers.lastOrderAt,
    })
    .from(customers)
    .where(where)
    .orderBy(desc(customers.lifetimeSpend))
    .limit(limit);
  return rows;
}

// ---------- preset segments (evaluated live; no DB rows) ----------
export type PresetSegment = { id: string; name: string; rules: string[]; def: RuleGroup };

export const PRESET_SEGMENTS: PresetSegment[] = [
  {
    id: "high-value-recent", name: "High-value recent buyers",
    rules: ["Total Revenue > $500", "Last Order within 30 days"],
    def: { op: "AND", rules: [{ field: "lifetime_spend", op: "gt", value: 500 }, { field: "last_order_at", op: "within_days", value: 30 }] },
  },
  {
    id: "at-risk", name: "At-risk customers",
    rules: ["Has placed at least 1 order", "Last order > 45 days ago"],
    def: { op: "AND", rules: [{ field: "order_count", op: "gte", value: 1 }, { field: "last_order_at", op: "older_than_days", value: 45 }] },
  },
  {
    id: "vip-high-ltv", name: "VIP or high LTV",
    rules: ["Customer Lifetime Value ≥ $1,000"],
    def: { op: "AND", rules: [{ field: "lifetime_spend", op: "gte", value: 1000 }] },
  },
  {
    id: "new-subs-7d", name: "New subscribers — last 7 days",
    rules: ["Contact created within 7 days", "Source is Form"],
    def: { op: "AND", rules: [{ field: "created_at", op: "within_days", value: 7 }, { field: "source", op: "eq", value: "form" }] },
  },
  {
    id: "shopify-buyers", name: "Shopify buyers",
    rules: ["Source is Shopify"],
    def: { op: "AND", rules: [{ field: "source", op: "eq", value: "shopify" }] },
  },
  {
    id: "repeat-buyers", name: "Repeat buyers (3+ orders)",
    rules: ["Total orders > 2"],
    def: { op: "AND", rules: [{ field: "order_count", op: "gt", value: 2 }] },
  },
];

export function getPreset(id: string): PresetSegment | undefined {
  return PRESET_SEGMENTS.find((s) => s.id === id);
}

// ---------- stored segment CRUD (for user-created segments) ----------
export function listSegments(orgId: number) {
  return db.select().from(segments).where(eq(segments.orgId, orgId)).orderBy(desc(segments.createdAt));
}

export async function getSegmentById(id: number): Promise<Segment | null> {
  const rows = await db.select().from(segments).where(eq(segments.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createSegment(orgId: number, name: string, ruleDefinition: unknown, description?: string): Promise<number> {
  const [res] = await db.insert(segments).values({ orgId, name, ruleDefinition, description });
  return res.insertId;
}

export async function deleteSegment(id: number): Promise<void> {
  await db.delete(segments).where(eq(segments.id, id));
}
