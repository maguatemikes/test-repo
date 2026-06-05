"use client";

import { useRouter } from "next/navigation";
import { CustomersView } from "@/components/pages-components/CustomersView";
import { customerSubTabToPath, type CustomerSubTab } from "@/components/navigation-types";

export default function CustomerListsPage() {
  const router = useRouter();
  return (
    <CustomersView
      initialTab="lists"
      onSubTabChange={(tab: CustomerSubTab) => router.push(customerSubTabToPath(tab))}
    />
  );
}
