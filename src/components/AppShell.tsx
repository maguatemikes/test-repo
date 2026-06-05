"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import {
  pathToSection,
  pathToCustomerSubTab,
  sectionToPath,
  customerSubTabToPath,
  type NavSection,
  type CustomerSubTab,
} from "@/components/navigation-types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const active = pathToSection(pathname);
  const customerSubTab =
    active === "customers" ? pathToCustomerSubTab(pathname) : undefined;

  const handleNavigate = (section: NavSection) =>
    router.push(sectionToPath(section));

  const handleNavigateCustomer = (sub: CustomerSubTab) =>
    router.push(customerSubTabToPath(sub));

  const handleTopBarAction = () => {
    if (active === "dashboard" || active === "campaigns") router.push("/campaigns");
    else if (active === "automations") router.push("/automations");
    else if (active === "forms") router.push("/forms");
    else if (active === "settings") router.push("/settings");
  };

  const isFullHeight =
    active === "automations" || active === "forms" || active === "settings";

  return (
    <div
      className="flex size-full"
      style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", background: "var(--background)", overflow: "hidden" }}
    >
      <Sidebar
        active={active}
        customerSubTab={customerSubTab}
        onNavigate={handleNavigate}
        onNavigateCustomer={handleNavigateCustomer}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar active={active} onNavigate={handleNavigate} onAction={handleTopBarAction} />

        <main
          className={isFullHeight ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto"}
          style={{ background: "var(--background)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
