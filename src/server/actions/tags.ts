"use server";

/**
 * Server actions for tags — thin wrappers a client component can call directly.
 * They validate input, call the repository, and revalidate the affected page.
 */
import { revalidatePath } from "next/cache";
import { assignTag, createTag, deleteTag, listTags, removeTag } from "@/server/repositories/tags";
import { validateTagInput } from "@/server/validators/tag";

// TODO: derive from the authenticated session/organization once auth is wired.
const ORG_ID = 1;

export async function listTagsAction() {
  return listTags(ORG_ID);
}

export async function createTagAction(input: { name: string; color?: string }) {
  const { name, color } = validateTagInput(input);
  const id = await createTag(ORG_ID, name, color);
  revalidatePath("/customers");
  return { id };
}

export async function deleteTagAction(id: number) {
  await deleteTag(id);
  revalidatePath("/customers");
}

export async function assignTagAction(customerId: number, tagId: number) {
  await assignTag(customerId, tagId);
  revalidatePath("/customers");
}

export async function removeTagAction(customerId: number, tagId: number) {
  await removeTag(customerId, tagId);
  revalidatePath("/customers");
}
