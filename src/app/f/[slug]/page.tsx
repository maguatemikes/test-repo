import { notFound } from "next/navigation";
import { HostedForm } from "@/components/HostedForm";

/** Public hosted form — renders config from crm-api GET /api/public/forms/{slug}. */
const API_BASE = process.env.NETX_API_BASE_URL;
const parse = (s: unknown) => { try { return typeof s === "string" ? JSON.parse(s) : s; } catch { return null; } };

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

  let form: Record<string, unknown> | null = null;
  let error = false;
  if (!API_BASE) {
    error = true;
  } else {
    try {
      const res = await fetch(`${API_BASE}/public/forms/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (res.ok) form = await res.json();
      else if (res.status !== 404) error = true;
    } catch {
      error = true;
    }
  }

  if (error) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
        <p style={{ fontSize: 14, color: "#64748B", textAlign: "center" }}>This form is temporarily unavailable. Please try again shortly.</p>
      </div>
    );
  }

  if (!form || form.Status === "archived") {
    notFound();
  }

  return (
    <HostedForm
      slug={slug}
      name={form.Name as string}
      fields={(parse(form.FieldsJson) as never) ?? []}
      design={(parse(form.DesignJson) as never) ?? null}
      success={(parse(form.SuccessBehaviorJson) as never) ?? null}
      embed={embed === "1"}
    />
  );
}
