export type NavSection =
  | "dashboard"
  | "customers"
  | "campaigns"
  | "automations"
  | "forms"
  | "analytics"
  | "settings";

export type CustomerSubTab = "customers" | "lists" | "segments";

/** Map a nav section to its App Router path (dashboard is the index route). */
export function sectionToPath(section: NavSection): string {
  return section === "dashboard" ? "/" : `/${section}`;
}

/** Derive the active nav section from the current pathname. */
export function pathToSection(pathname: string): NavSection {
  if (pathname === "/" || pathname === "") return "dashboard";
  const first = pathname.split("/").filter(Boolean)[0];
  const sections: NavSection[] = [
    "customers",
    "campaigns",
    "automations",
    "forms",
    "analytics",
    "settings",
  ];
  return sections.includes(first as NavSection) ? (first as NavSection) : "dashboard";
}

/** Map a customers sub-tab to its nested route. */
export function customerSubTabToPath(sub: CustomerSubTab): string {
  return sub === "customers" ? "/customers" : `/customers/${sub}`;
}

/** Derive the active customers sub-tab from the current pathname. */
export function pathToCustomerSubTab(pathname: string): CustomerSubTab {
  const segments = pathname.split("/").filter(Boolean);
  const sub = segments[1];
  return sub === "lists" || sub === "segments" ? sub : "customers";
}
