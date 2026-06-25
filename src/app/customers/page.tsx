import { fetchCustomers, fetchFacets } from "@/lib/api/customers";
import { CustomersClient } from "@/components/pages-components/CustomersClient";

const PAGE_SIZE = 50; // matches crm-api default

export const dynamic = "force-dynamic";

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const daysSince = (d: string | null) =>
  d ? (Date.now() - new Date(d).getTime()) / 86_400_000 : Infinity;

/** Derive behavioral tags from the order metrics returned by crm-api. */
function computeTags(r: { lifetimeSpend?: number | null; orderCount?: number | null; lastOrderAt?: string | null }): string[] {
  const tags: string[] = [];
  const spend = Number(r.lifetimeSpend ?? 0);
  const orders = r.orderCount ?? 0;
  const dsl = daysSince(r.lastOrderAt ?? null);

  if (spend >= 1000) tags.push("VIP");
  else if (spend >= 500) tags.push("High LTV");
  if (orders >= 5) tags.push("Loyal");
  if (orders >= 1 && dsl > 60) tags.push("At Risk");
  if (orders <= 1 && dsl <= 60) tags.push("New");
  if (tags.length === 0) tags.push("Customer");
  return tags;
}

// crm-api now returns computed behavioral flags per row — map to display labels.
const FLAG_LABELS: Record<string, string> = {
  vip: "VIP", loyal: "Loyal", at_risk: "At Risk", new: "New",
  high_ltv: "High LTV", has_refund: "Has Refund", churned: "Churned",
};
const flagLabel = (f: string) => FLAG_LABELS[f] || f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
// "subscribed" is near-universal and already implied by status — keep it out of the chip row.
const flagsToTags = (flags: string[]) => flags.filter((f) => f !== "subscribed").map(flagLabel);

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tag?: string; source?: string; channel?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const tag = (sp.tag ?? "").trim();
  const source = (sp.source ?? "").trim();
  const channel = (sp.channel ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // Data now comes from crm-api. Map the chip label → crm-api `filter` value.
  const FILTER_MAP: Record<string, string> = {
    "VIP": "vip",
    "At Risk": "at_risk",
    "New": "new_30d",
    "Has Refund": "has_refund",
    "Subscribed": "subscribed",
  };
  const [res, facets] = await Promise.all([
    fetchCustomers({ q, page, pageSize: PAGE_SIZE, filter: FILTER_MAP[tag] || "", channel, source }),
    fetchFacets(),
  ]);

  const dbCustomers: React.ComponentProps<typeof CustomersClient>["dbCustomers"] = res.rows.map((r) => ({
    id: String(r.id),
    name: r.displayName || [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email,
    email: r.email,
    phone: "—",
    tags: r.flags?.length ? flagsToTags(r.flags) : computeTags(r),
    manualTags: (r.tags ?? []).map((t) => ({ id: t.id, name: t.name, color: t.color })),
    spend: `$${Number(r.lifetimeSpend ?? 0).toLocaleString()}`,
    ltv: Number(r.lifetimeSpend ?? 0),
    lastOrder: fmt(r.lastOrderAt),
    lastEmail: fmt(r.lastEngagementAt),
    status: r.isSubscribed ? "active" : "at-risk",
    location: "—",
    joined: fmt(r.createdAt),
    channel: r.channels?.[0] || "—",
    source: r.source || "—",
  }));

  return (
    <CustomersClient
      dbCustomers={dbCustomers}
      total={res.total}
      page={res.page}
      pageSize={res.pageSize}
      query={q}
      tag={tag}
      source={source}
      channel={channel}
      channels={facets.channels}
      sources={facets.sources}
    />
  );
}
