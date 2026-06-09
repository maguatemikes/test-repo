import type { Metadata } from "next";
import { VerifyConfirmView } from "@/components/pages-components/VerifyConfirmView";

export const metadata: Metadata = {
  title: "Verifying… · CRM",
  robots: { index: false, follow: false },
};

export default async function VerifyConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <VerifyConfirmView token={token} />;
}
