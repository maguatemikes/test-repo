import { NextResponse } from "next/server";
import { getCustomers, upsertCustomerByEmail } from "@/server/repositories/customers";
import { validateCustomerInput } from "@/server/validators/customer";

// TODO: derive from auth/session once wired.
const ORG_ID = 1;

export const dynamic = "force-dynamic";

// GET /api/customers — list customers
export async function GET() {
  const customers = await getCustomers(ORG_ID);
  return NextResponse.json({ ok: true, count: customers.length, customers });
}

// POST /api/customers — create/upsert a customer (JSON: { email, displayName? })
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, displayName } = validateCustomerInput(body);
    const id = await upsertCustomerByEmail(ORG_ID, email, {
      displayName,
      source: "api",
      isSubscribed: true,
      subscribedAt: new Date(),
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
