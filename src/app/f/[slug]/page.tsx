import { notFound } from "next/navigation";
import { getFormBySlug } from "@/server/repositories/forms";
import { HostedForm } from "@/components/HostedForm";

// TODO: derive org from host/session once multi-tenant routing is wired.
const ORG_ID = 1;

export const dynamic = "force-dynamic";

export default async function HostedFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { slug } = await params;
  const { embed } = await searchParams;
  const form = await getFormBySlug(ORG_ID, slug);

  if (!form || form.status === "archived") {
    notFound();
  }

  return (
    <HostedForm
      slug={slug}
      name={form.name}
      fields={(form.fieldsJson as never) ?? []}
      design={(form.designJson as never) ?? null}
      success={(form.successBehaviorJson as never) ?? null}
      embed={embed === "1"}
    />
  );
}
