"use client";

import { useRouter } from "next/navigation";
import { CustomersView } from "@/components/pages-components/CustomersView";
import { customerSubTabToPath, type CustomerSubTab } from "@/components/navigation-types";

export default function CustomersPage() {
  const router = useRouter();
  return (
    <CustomersView
      initialTab="customers"
      onSubTabChange={(tab: CustomerSubTab) => router.push(customerSubTabToPath(tab))}
    />
  );
}
