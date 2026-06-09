import type { Metadata } from "next";
import { ForgotPasswordView } from "@/components/pages-components/ForgotPasswordView";

export const metadata: Metadata = {
  title: "Reset your password · CRM",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
