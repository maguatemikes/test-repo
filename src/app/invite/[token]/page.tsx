import type { Metadata } from "next";
import { InviteAcceptView } from "@/components/pages-components/InviteAcceptView";

export const metadata: Metadata = {
  title: "Accept invitation · CRM",
  robots: { index: false, follow: false },
};

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteAcceptView token={token} />;
}
