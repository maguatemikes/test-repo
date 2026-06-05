/**
 * Forms data-access layer (server-only).
 * Form definitions (crm_forms) + submissions (crm_form_submissions).
 */
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { forms, formSubmissions } from "@/lib/db/schema";

export type Form = typeof forms.$inferSelect;
export type FormType = "popup" | "embed" | "slide_in" | "full_screen" | "hosted";
export type FormStatus = "draft" | "active" | "paused" | "archived";

export type FormField = {
  id: string;
  type: "email" | "text" | "tel" | "checkbox" | "select" | "textarea";
  label: string;
  required: boolean;
  options?: string[];
};

export type FormDesign = { accentColor: string; submitText: string; title: string; description: string };
export type FormTargeting = { urls: string; device: "all" | "desktop" | "mobile" };
export type FormSuccess = { trigger: string; action: "message" | "redirect" | "close"; message?: string; redirectUrl?: string };

export type FormInput = {
  name: string;
  type: FormType;
  status: FormStatus;
  targetListId: number | null;
  fields: FormField[];
  design: FormDesign;
  targeting: FormTargeting;
  success: FormSuccess;
};

function slugify(s: string): string {
  return (
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56) || "form"
  );
}

/** Build a slug unique within the org (appends -2, -3, … on collision). */
async function uniqueSlug(orgId: number, name: string, excludeId?: number): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const where = excludeId
      ? and(eq(forms.orgId, orgId), eq(forms.slug, candidate), ne(forms.id, excludeId))
      : and(eq(forms.orgId, orgId), eq(forms.slug, candidate));
    const rows = await db.select({ id: forms.id }).from(forms).where(where).limit(1);
    if (rows.length === 0) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export function listForms(orgId: number) {
  return db.select().from(forms).where(eq(forms.orgId, orgId)).orderBy(forms.id);
}

export async function getFormById(id: number): Promise<Form | null> {
  const rows = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getFormBySlug(orgId: number, slug: string): Promise<Form | null> {
  const rows = await db
    .select()
    .from(forms)
    .where(and(eq(forms.orgId, orgId), eq(forms.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createForm(orgId: number, input: FormInput): Promise<{ id: number; slug: string }> {
  const slug = await uniqueSlug(orgId, input.name);
  const [res] = await db.insert(forms).values({
    orgId,
    slug,
    name: input.name,
    type: input.type,
    fieldsJson: input.fields,
    designJson: input.design,
    targetingJson: input.targeting,
    successBehaviorJson: input.success,
    targetListId: input.targetListId ?? null,
    status: input.status,
  });
  return { id: res.insertId, slug };
}

export async function updateForm(id: number, orgId: number, input: FormInput): Promise<{ slug: string }> {
  const slug = await uniqueSlug(orgId, input.name, id);
  await db
    .update(forms)
    .set({
      name: input.name,
      slug,
      type: input.type,
      fieldsJson: input.fields,
      designJson: input.design,
      targetingJson: input.targeting,
      successBehaviorJson: input.success,
      targetListId: input.targetListId ?? null,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(forms.id, id));
  return { slug };
}

export async function setFormStatus(id: number, status: FormStatus): Promise<void> {
  await db.update(forms).set({ status, updatedAt: new Date() }).where(eq(forms.id, id));
}

export async function deleteForm(id: number): Promise<void> {
  await db.delete(forms).where(eq(forms.id, id));
}

export async function recordSubmission(input: {
  orgId: number;
  formId: number;
  customerId?: number | null;
  dataJson: unknown;
  sourceUrl?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<number> {
  const [res] = await db.insert(formSubmissions).values({
    orgId: input.orgId,
    formId: input.formId,
    customerId: input.customerId ?? null,
    dataJson: input.dataJson,
    sourceUrl: input.sourceUrl,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
  await db.update(forms).set({ submissions: sql`${forms.submissions} + 1` }).where(eq(forms.id, input.formId));
  return res.insertId;
}
