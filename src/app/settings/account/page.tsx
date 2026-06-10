import type { Metadata } from "next";
import { AccountSettingsView } from "@/components/pages-components/AccountSettingsView";

export const metadata: Metadata = {
  title: "Account settings · CRM",
  robots: { index: false, follow: false },
};

export default function AccountSettingsPage() {
  return <AccountSettingsView />;
}
