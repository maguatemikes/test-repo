"use client";

import { useRouter } from "next/navigation";
import { CustomersView } from "./CustomersView";
import { customerSubTabToPath, type CustomerSubTab } from "@/components/navigation-types";

type Props = {
  dbCustomers?: React.ComponentProps<typeof CustomersView>["dbCustomers"];
  total?: number;
  page?: number;
  pageSize?: number;
  query?: string;
  tag?: string;
  source?: string;
  channel?: string;
  channels?: string[];
};

export function CustomersClient({
  dbCustomers, total = 0, page = 1, pageSize = 100, query = "", tag = "", source = "", channel = "", channels = [],
}: Props) {
  const router = useRouter();

  const buildUrl = (overrides: Partial<{ q: string; tag: string; source: string; channel: string; page: string }>) => {
    const merged = { q: query, tag, source, channel, page: String(page), ...overrides };
    const sp = new URLSearchParams();
    if (merged.q) sp.set("q", merged.q);
    if (merged.tag) sp.set("tag", merged.tag);
    if (merged.source) sp.set("source", merged.source);
    if (merged.channel) sp.set("channel", merged.channel);
    if (merged.page && merged.page !== "1") sp.set("page", merged.page);
    const qs = sp.toString();
    router.replace(qs ? `/customers?${qs}` : "/customers", { scroll: false });
  };

  return (
    <CustomersView
      initialTab="customers"
      onSubTabChange={(tab: CustomerSubTab) => router.push(customerSubTabToPath(tab))}
      dbCustomers={dbCustomers}
      total={total}
      page={page}
      pageSize={pageSize}
      serverQuery={query}
      serverTag={tag}
      serverSource={source}
      serverChannel={channel}
      channels={channels}
      onSearch={(q) => buildUrl({ q, page: "1" })}
      onFilter={(key, value) => buildUrl({ [key]: value, page: "1" })}
      onPage={(p) => buildUrl({ page: String(p) })}
    />
  );
}
