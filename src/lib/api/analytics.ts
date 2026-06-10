import { cookies } from "next/headers";

/**
 * crm-api analytics client (server-only). Fetches the three analytics
 * endpoints in parallel and forwards the caller's session cookie.
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export type DateRange = { from: string; to: string };

export type EmailAnalytics = {
  range: DateRange;
  sends: number;
  openRate: number;
  clickRate: number;
  unsubRate: number;
  series: { date: string; sends: number; opens: number; clicks: number }[];
  topCampaigns: { name: string; revenue: number; openRate: number; clickRate: number }[];
  recentCampaignCount: number;
  note?: string;
};

export type CustomerAnalytics = {
  range: DateRange;
  totalCustomers: number;
  newInRange: number;
  returning: number;
  ltvDistribution: { bucket: string; count: number }[];
  churn180dCount: number;
};

export type EcommerceAnalytics = {
  range: DateRange;
  revenue: number;
  orderCount: number;
  buyerCount: number;
  aov: number;
  topChannels: { channel: string; orders: number; revenue: number }[];
};

export type AnalyticsData = {
  email: EmailAnalytics | null;
  customers: CustomerAnalytics | null;
  ecommerce: EcommerceAnalytics | null;
};

/** Fetch all three analytics endpoints for the given range. Returns nulls on no-config / 401 / error. */
export async function fetchAnalytics(range?: Partial<DateRange>): Promise<AnalyticsData> {
  const empty: AnalyticsData = { email: null, customers: null, ecommerce: null };
  if (!API_BASE) return empty;

  const qs = range?.from && range?.to ? `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}` : "";
  const cookie = (await cookies()).toString();
  const get = <T>(ep: string): Promise<T | null> =>
    fetch(`${API_BASE}/analytics/${ep}${qs}`, { headers: cookie ? { cookie } : {}, cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
      .catch(() => null);

  const [email, customers, ecommerce] = await Promise.all([
    get<EmailAnalytics>("email"),
    get<CustomerAnalytics>("customers"),
    get<EcommerceAnalytics>("ecommerce"),
  ]);
  return { email, customers, ecommerce };
}
