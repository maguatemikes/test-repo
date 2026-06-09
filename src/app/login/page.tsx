import type { Metadata } from "next";
import { LoginView } from "@/components/pages-components/LoginView";

export const metadata: Metadata = {
  title: "Sign in · CRM",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginView />;
}
