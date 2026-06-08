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
};

export function CustomersClient({ dbCustomers, total = 0, page = 1, pageSize = 100, query = "" }: Props) {
  const router = useRouter();

  const go = (q: string, p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (p > 1) sp.set("page", String(p));
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
      onSearch={(q) => go(q, 1)}
      onPage={(p) => go(query, p)}
    />
  );
}
