import type { Metadata } from "next";
import { TwoFactorSetupView } from "@/components/pages-components/TwoFactorSetupView";

export const metadata: Metadata = {
  title: "Security · CRM",
  robots: { index: false, follow: false },
};

export default function SecuritySettingsPage() {
  return <TwoFactorSetupView />;
}
