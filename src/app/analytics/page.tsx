import { fetchAnalytics } from "@/lib/api/analytics";
import { AnalyticsView } from "@/components/pages-components/AnalyticsView";

export const dynamic = "force-dynamic";

const RANGE_DAYS: Record<string, number> = { "30D": 30, "90D": 90, "6M": 182, "12M": 365 };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const rangeKey = sp.range && RANGE_DAYS[sp.range] ? sp.range : "30D";
  const to = new Date();
  const from = new Date(to.getTime() - RANGE_DAYS[rangeKey] * 24 * 60 * 60 * 1000);
  const data = await fetchAnalytics({ from: from.toISOString(), to: to.toISOString() });
  return <AnalyticsView data={data} rangeKey={rangeKey} />;
}
