"use client";

import { useEffect, useState } from "react";
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Public routes render standalone — no dashboard chrome.
  //   /f/...  → hosted, embeddable forms
  //   auth    → login and the rest of the Phase-1 auth flow
  const AUTH_PREFIXES = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset",
    "/verify",
    "/invite",
  ];
  const isStandalone =
    (pathname?.startsWith("/f/") ?? false) ||
    AUTH_PREFIXES.some((p) => pathname?.startsWith(p));
  if (isStandalone) {
    return <>{children}</>;
  }

  const active = pathToSection(pathname);
  const customerSubTab =
    active === "customers" ? pathToCustomerSubTab(pathname) : undefined;

  const handleNavigate = (section: NavSection) => {
    setMobileNavOpen(false);
    router.push(sectionToPath(section));
  };

  const handleNavigateCustomer = (sub: CustomerSubTab) => {
    setMobileNavOpen(false);
    router.push(customerSubTabToPath(sub));
  };

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
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          active={active}
          onNavigate={handleNavigate}
          onAction={handleTopBarAction}
          onMenuClick={() => setMobileNavOpen(true)}
        />

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
