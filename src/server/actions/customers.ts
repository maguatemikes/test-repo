"use server";

/**
 * Server actions for customers — callable from client components.
 */
import { revalidatePath } from "next/cache";
import { deleteCustomer, upsertCustomerByEmail } from "@/server/repositories/customers";
import { validateCustomerInput } from "@/server/validators/customer";

// TODO: derive from the authenticated session/organization once auth is wired.
const ORG_ID = 1;

export async function createCustomerAction(input: { email: string; displayName?: string }) {
  const { email, displayName } = validateCustomerInput(input);
  const id = await upsertCustomerByEmail(ORG_ID, email, {
    displayName,
    source: "manual",
    isSubscribed: true,
    subscribedAt: new Date(),
  });
  revalidatePath("/customers");
  return { id };
}

export async function deleteCustomerAction(id: number) {
  await deleteCustomer(id);
  revalidatePath("/customers");
}
