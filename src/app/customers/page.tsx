import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers as customersTable } from "@/lib/db/schema";
import { CustomersClient } from "@/components/pages-components/CustomersClient";

// Always read fresh from the database (no static caching).
export const dynamic = "force-dynamic";

const fmt = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default async function CustomersPage() {
  let dbCustomers: React.ComponentProps<typeof CustomersClient>["dbCustomers"] = [];

  try {
    const rows = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.orgId, 1))
      .orderBy(desc(customersTable.createdAt))
      .limit(200);

    dbCustomers = rows.map((r) => ({
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
    }));
  } catch (err) {
    console.error("[customers] DB fetch failed:", err);
  }

  return <CustomersClient dbCustomers={dbCustomers} />;
}
