import type { Metadata } from "next";
import { ResetPasswordView } from "@/components/pages-components/ResetPasswordView";

export const metadata: Metadata = {
  title: "Set a new password · CRM",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ResetPasswordView token={token} />;
}
