"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { SessionExpiredModal } from "@/components/SessionExpiredModal";
import { SessionProvider } from "@/components/SessionProvider";
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
  // Navigation as a transition: keeps the current page visible while the next route
  // loads, and exposes a pending flag for the top progress bar (no blank "snap").
  const [isNavigating, startTransition] = useTransition();

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
    startTransition(() => router.push(sectionToPath(section)));
  };

  const handleNavigateCustomer = (sub: CustomerSubTab) => {
    setMobileNavOpen(false);
    startTransition(() => router.push(customerSubTabToPath(sub)));
  };

  const handleTopBarAction = () => {
    startTransition(() => {
      if (active === "dashboard" || active === "campaigns") router.push("/campaigns");
      else if (active === "automations") router.push("/automations");
      else if (active === "forms") router.push("/forms");
      else if (active === "settings") router.push("/settings");
    });
  };

  const isFullHeight =
    active === "automations" || active === "forms" || active === "settings";

  return (
    <SessionProvider>
    <NavProgress active={isNavigating} />
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

      <SessionExpiredModal />
    </div>
    </SessionProvider>
  );
}

/** Thin top progress bar shown while a route navigation is pending. */
function NavProgress({ active }: { active: boolean }) {
  return (
    <>
      <style>{`@keyframes nx-navprogress { 0% { transform: translateX(-100%); } 100% { transform: translateX(500%); } }`}</style>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2.5, zIndex: 100, pointerEvents: "none", opacity: active ? 1 : 0, transition: "opacity 0.2s ease", overflow: "hidden" }}>
        {active && <div style={{ height: "100%", width: "20%", background: "#2563EB", borderRadius: 999, boxShadow: "0 0 8px rgba(37,99,235,0.5)", animation: "nx-navprogress 0.9s ease-in-out infinite" }} />}
      </div>
    </>
  );
}
