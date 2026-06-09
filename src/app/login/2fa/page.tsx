import type { Metadata } from "next";
import { TwoFactorChallengeView } from "@/components/pages-components/TwoFactorChallengeView";

export const metadata: Metadata = {
  title: "Two-step verification · CRM",
  robots: { index: false, follow: false },
};

export default function TwoFactorChallengePage() {
  return <TwoFactorChallengeView />;
}
