"use server";

import { revalidatePath } from "next/cache";
import {
  createForm,
  updateForm,
  deleteForm,
  setFormStatus,
  type FormInput,
  type FormStatus,
} from "@/server/repositories/forms";

// TODO: derive from the authenticated org once auth is wired.
const ORG_ID = 1;

function validate(input: FormInput) {
  if (!input.name?.trim()) throw new Error("Form name is required");
  if (!input.fields?.length) throw new Error("Add at least one field");
  if (!input.fields.some((f) => f.type === "email")) throw new Error("A form needs an email field");
}

export async function createFormAction(input: FormInput) {
  validate(input);
  const res = await createForm(ORG_ID, input);
  revalidatePath("/forms");
  return res; // { id, slug }
}

export async function updateFormAction(id: number, input: FormInput) {
  validate(input);
  const res = await updateForm(id, ORG_ID, input);
  revalidatePath("/forms");
  revalidatePath(`/f/${res.slug}`);
  return res; // { slug }
}

export async function deleteFormAction(id: number) {
  await deleteForm(id);
  revalidatePath("/forms");
}

export async function setFormStatusAction(id: number, status: FormStatus) {
  await setFormStatus(id, status);
  revalidatePath("/forms");
}
