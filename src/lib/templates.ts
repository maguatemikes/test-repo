/**
 * crm-api templates client (browser → /api/templates proxy → crm-api).
 * Replaces the old localStorage mock. Shared by the Content section and the
 * Campaign composer's content step.
 */
export type Template = {
  id: number;
  name: string;
  category?: string | null;
  subjectDefault?: string | null;
  htmlBody?: string | null;
  textBody?: string | null;
  design?: unknown;
  updatedAt?: string | null;
};

const list = (d: unknown): Template[] => (Array.isArray(d) ? d : (((d as { rows?: Template[] })?.rows) ?? []));

/** GET /api/templates — summary rows. */
export async function listTemplates(): Promise<Template[]> {
  try {
    const r = await fetch("/api/templates");
    if (!r.ok) return [];
    return list(await r.json());
  } catch {
    return [];
  }
}

/** GET /api/templates/{id} — full record (htmlBody + design). */
export async function getTemplate(id: number): Promise<Template | null> {
  try {
    const r = await fetch(`/api/templates/${id}`);
    if (!r.ok) return null;
    return (await r.json()) as Template;
  } catch {
    return null;
  }
}

type TemplateInput = { name: string; subjectDefault?: string; htmlBody?: string; textBody?: string; category?: string; design?: unknown };

/** POST /api/templates → { ok, id }. */
export async function createTemplate(input: TemplateInput): Promise<{ ok: boolean; id?: number; error?: string }> {
  const r = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const d = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: d.id } : { ok: false, error: d.error || "Failed to create" };
}

/** PATCH /api/templates/{id}. */
export async function updateTemplate(id: number, input: Partial<TemplateInput>): Promise<boolean> {
  const r = await fetch(`/api/templates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  return r.ok;
}

/** DELETE /api/templates/{id} (soft archive). */
export async function deleteTemplate(id: number): Promise<boolean> {
  const r = await fetch(`/api/templates/${id}`, { method: "DELETE" });
  return r.ok;
}

/** POST /api/templates/{id}/duplicate. */
export async function duplicateTemplate(id: number): Promise<boolean> {
  const r = await fetch(`/api/templates/${id}/duplicate`, { method: "POST" });
  return r.ok;
}
