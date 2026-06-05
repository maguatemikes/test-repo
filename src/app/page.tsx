"use client";

import { useRouter } from "next/navigation";
import { DashboardView } from "@/components/pages-components/DashboardView";
import { sectionToPath, type NavSection } from "@/components/navigation-types";

export default function DashboardPage() {
  const router = useRouter();
  return <DashboardView onNavigate={(section: NavSection) => router.push(sectionToPath(section))} />;
}
