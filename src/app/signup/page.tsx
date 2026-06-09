import type { Metadata } from "next";
import { SignupView } from "@/components/pages-components/SignupView";

export const metadata: Metadata = {
  title: "Create your account · CRM",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupView />;
}
