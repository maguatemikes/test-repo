"use client";

import { useRouter } from "next/navigation";
import { CustomersView } from "./CustomersView";
import { customerSubTabToPath, type CustomerSubTab } from "@/components/navigation-types";

type Props = {
  dbCustomers?: React.ComponentProps<typeof CustomersView>["dbCustomers"];
};

export function CustomersClient({ dbCustomers }: Props) {
  const router = useRouter();
  return (
    <CustomersView
      initialTab="customers"
      onSubTabChange={(tab: CustomerSubTab) => router.push(customerSubTabToPath(tab))}
      dbCustomers={dbCustomers}
    />
  );
}
