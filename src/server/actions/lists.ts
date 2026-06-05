"use server";

import { revalidatePath } from "next/cache";
import { listLists, createList } from "@/server/repositories/lists";

// TODO: derive from the authenticated org once auth is wired.
const ORG_ID = 1;

export async function listListsAction() {
  return listLists(ORG_ID);
}

export async function createListAction(name: string) {
  if (!name?.trim()) throw new Error("List name is required");
  const id = await createList(ORG_ID, name.trim(), { source: "form" });
  revalidatePath("/forms");
  return { id };
}
