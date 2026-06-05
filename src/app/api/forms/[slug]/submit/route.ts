import { NextResponse } from "next/server";
import { getFormBySlug, recordSubmission } from "@/server/repositories/forms";
import { upsertCustomerByEmail } from "@/server/repositories/customers";
import { addMember } from "@/server/repositories/lists";
import { validateCustomerInput } from "@/server/validators/customer";

// TODO: derive from auth/host/session once wired.
const ORG_ID = 1;

// Allow cross-origin submissions (embeds on Shopify / any external site).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Preflight for cross-origin POSTs.
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// POST /api/forms/{slug}/submit — public form submission
// JSON body: { email, displayName?, ...otherFields }
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const form = await getFormBySlug(ORG_ID, slug);
    if (!form) {
      return NextResponse.json({ ok: false, error: "Form not found" }, { status: 404, headers: CORS });
    }

    const body = await req.json();
    const { email, displayName } = validateCustomerInput(body);

    // 1) Upsert the subscriber (dedupe by org + email)
    const customerId = await upsertCustomerByEmail(ORG_ID, email, {
      displayName,
      source: "form",
      isSubscribed: true,
      subscribedAt: new Date(),
      consentSource: `form:${slug}`,
    });

    // 2) Log the raw submission
    await recordSubmission({
      orgId: ORG_ID,
      formId: form.id,
      customerId,
      dataJson: body,
      sourceUrl: req.headers.get("referer") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    // 3) Add to the form's target list (the "reflected to the list via form" step)
    if (form.targetListId) {
      await addMember(form.targetListId, customerId);
    }

    return NextResponse.json({ ok: true, customerId }, { status: 201, headers: CORS });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400, headers: CORS });
  }
}
