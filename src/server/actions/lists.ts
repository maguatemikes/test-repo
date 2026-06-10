"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/** Create a list via crm-api (used by the form builder's "new target list"). */
const API_BASE = process.env.NETX_API_BASE_URL;

export async function createListAction(name: string) {
  if (!name?.trim()) throw new Error("List name is required");
  if (!API_BASE) throw new Error("Lists service is not configured.");
  const cookie = (await cookies()).toString();
  const res = await fetch(`${API_BASE}/lists`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ name: name.trim(), source: "form" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to create list");
  const d = await res.json().catch(() => ({}));
  revalidatePath("/forms");
  return { id: d.Id ?? d.id };
}
