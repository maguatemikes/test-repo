import type { Metadata } from "next";
import { VerifyEmailView } from "@/components/pages-components/VerifyEmailView";

export const metadata: Metadata = {
  title: "Verify your email · CRM",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <VerifyEmailView email={email} />;
}
