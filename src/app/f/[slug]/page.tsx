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

  let form: Awaited<ReturnType<typeof getFormBySlug>> = null;
  let dbError = false;
  try {
    form = await getFormBySlug(ORG_ID, slug);
  } catch (err) {
    console.error("[f/[slug]] DB error:", err);
    dbError = true;
  }

  if (dbError) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
        <p style={{ fontSize: 14, color: "#64748B", textAlign: "center" }}>This form is temporarily unavailable. Please try again shortly.</p>
      </div>
    );
  }

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
