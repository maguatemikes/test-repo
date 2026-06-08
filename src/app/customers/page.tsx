import { searchCustomers } from "@/server/repositories/customers";
import { CustomersClient } from "@/components/pages-components/CustomersClient";

// TODO: derive org from auth once wired.
const ORG_ID = 1;
const PAGE_SIZE = 100;

export const dynamic = "force-dynamic";

const fmt = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const daysSince = (d: Date | string | null) =>
  d ? (Date.now() - new Date(d).getTime()) / 86_400_000 : Infinity;

const sourceLabel = (s: string | null | undefined) => {
  switch (s) {
    case "netx_backfill": return "Import";
    case "form": return "Form";
    case "api": return "API";
    case "manual": return "Manual";
    case "csv": return "CSV";
    case "shopify": return "Shopify";
    default: return s || "—";
  }
};

/** Derive behavioral tags from the live order metrics (no DB writes). */
function computeTags(r: {
  lifetimeSpend?: string | number | null;
  orderCount?: number | null;
  refundCount?: number | null;
  lastOrderAt?: Date | string | null;
}): string[] {
  const tags: string[] = [];
  const spend = Number(r.lifetimeSpend ?? 0);
  const orders = r.orderCount ?? 0;
  const refunds = r.refundCount ?? 0;
  const dsl = daysSince(r.lastOrderAt ?? null);

  if (spend >= 1000) tags.push("VIP");
  else if (spend >= 500) tags.push("High LTV");
  if (orders >= 5) tags.push("Loyal");
  if (orders >= 1 && dsl > 60) tags.push("At Risk");
  if (orders <= 1 && dsl <= 60) tags.push("New");
  if (refunds >= 1) tags.push("Has Refund");
  if (tags.length === 0) tags.push("Customer");
  return tags;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  let dbCustomers: React.ComponentProps<typeof CustomersClient>["dbCustomers"] = [];
  let total = 0;

  try {
    const res = await searchCustomers(ORG_ID, { q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
    total = res.total;
    dbCustomers = res.rows.map((r) => ({
      id: String(r.id),
      name: r.displayName || [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email,
      email: r.email,
      phone: r.phone || "—",
      tags: computeTags(r),
      spend: `$${Number(r.lifetimeSpend ?? 0).toLocaleString()}`,
      ltv: Number(r.lifetimeSpend ?? 0),
      lastOrder: fmt(r.lastOrderAt),
      lastEmail: fmt(r.lastEngagementAt),
      status: r.isSubscribed ? "active" : "at-risk",
      location: r.company || "—",
      joined: fmt(r.createdAt),
      channel: r.primaryChannel || "—",
      source: sourceLabel(r.source),
    }));
  } catch (err) {
    console.error("[customers] DB fetch failed:", err);
  }

  return (
    <CustomersClient
      dbCustomers={dbCustomers}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      query={q}
    />
  );
}
