"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/** Form actions now talk to crm-api (no direct DB). */
const API_BASE = process.env.NETX_API_BASE_URL;

export type FormField = { id: string; type: string; label: string; required: boolean };
export type FormStatus = "draft" | "active" | "paused" | "archived";
export type FormInput = {
  name: string;
  type: string;
  targetListId?: number | null;
  fields: FormField[];
  design?: unknown;
  targeting?: unknown;
  success?: unknown;
  status?: FormStatus;
};

function validate(input: FormInput) {
  if (!input.name?.trim()) throw new Error("Form name is required");
  if (!input.fields?.length) throw new Error("Add at least one field");
  if (!input.fields.some((f) => f.type === "email")) throw new Error("A form needs an email field");
}

async function api(path: string, init: RequestInit) {
  if (!API_BASE) throw new Error("Forms service is not configured.");
  const cookie = (await cookies()).toString();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    cache: "no-store",
  });
}

// crm-api POST/PATCH body: { name, type, targetListId, fields, design, behavior } (behavior = our success).
const toApiBody = (input: FormInput) => ({
  name: input.name,
  type: input.type,
  targetListId: input.targetListId ?? null,
  fields: input.fields,
  design: input.design,
  behavior: input.success,
  targeting: input.targeting,
});

export async function createFormAction(input: FormInput) {
  validate(input);
  const res = await api(`/forms`, { method: "POST", body: JSON.stringify(toApiBody(input)) });
  if (!res.ok) throw new Error("Failed to create form");
  const d = await res.json().catch(() => ({}));
  revalidatePath("/forms");
  return { id: d.Id ?? d.id, slug: d.Slug ?? d.slug };
}

export async function updateFormAction(id: number, input: FormInput) {
  validate(input);
  const res = await api(`/forms/${id}`, { method: "PATCH", body: JSON.stringify(toApiBody(input)) });
  if (!res.ok) throw new Error("Failed to update form");
  const d = await res.json().catch(() => ({}));
  const slug = d.Slug ?? d.slug ?? "";
  revalidatePath("/forms");
  if (slug) revalidatePath(`/f/${slug}`);
  return { slug };
}

export async function deleteFormAction(id: number) {
  await api(`/forms/${id}`, { method: "DELETE" });
  revalidatePath("/forms");
}

export async function setFormStatusAction(id: number, status: FormStatus) {
  await api(`/forms/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  revalidatePath("/forms");
}
