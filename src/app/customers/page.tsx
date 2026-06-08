import { searchCustomers } from "@/server/repositories/customers";
import { CustomersClient } from "@/components/pages-components/CustomersClient";

// TODO: derive org from auth once wired.
const ORG_ID = 1;
const PAGE_SIZE = 100;

export const dynamic = "force-dynamic";

const fmt = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

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
      tags: r.isVip ? ["VIP"] : r.source ? [r.source.charAt(0).toUpperCase() + r.source.slice(1)] : ["New"],
      spend: `$${Number(r.lifetimeSpend ?? 0).toLocaleString()}`,
      ltv: Number(r.lifetimeSpend ?? 0),
      lastOrder: fmt(r.lastOrderAt),
      lastEmail: fmt(r.lastEngagementAt),
      status: r.isSubscribed ? "active" : "at-risk",
      location: r.company || "—",
      joined: fmt(r.createdAt),
      channel: r.primaryChannel || "—",
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
