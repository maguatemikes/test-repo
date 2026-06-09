import { NextResponse } from "next/server";
import { callNetx, fail, readUpstreamReason } from "@/lib/authProxy";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignupBody {
  email?: unknown;
  password?: unknown;
  orgName?: unknown;
  orgSlug?: unknown;
}

/**
 * POST /api/auth/signup
 * Creates a new organization + first user via the NetX auth service, which
 * provisions the org on the free plan and sends a verification email.
 */
export async function POST(req: Request) {
  let body: SignupBody;
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return fail("server", "Malformed request.", 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const orgName = typeof body.orgName === "string" ? body.orgName.trim() : "";
  const orgSlug = typeof body.orgSlug === "string" ? body.orgSlug : "";

  if (!EMAIL_RE.test(email)) return fail("invalid", "Enter a valid email address.", 400);
  if (password.length < 8)
    return fail("invalid", "Password must be at least 8 characters.", 400);
  if (orgName.length < 2) return fail("invalid", "Organization name is required.", 400);
  if (!/^[a-z0-9-]{2,}$/.test(orgSlug))
    return fail("invalid", "Invalid workspace URL.", 400);

  const call = await callNetx("/auth/signup", { email, password, orgName, orgSlug });
  if (!call.ok) return call.response;

  const { upstream } = call;
  if (upstream.ok) return NextResponse.json({ ok: true });

  const reason = await readUpstreamReason(upstream);
  if (upstream.status === 409 || reason.includes("exist") || reason.includes("taken")) {
    if (reason.includes("slug") || reason.includes("workspace")) {
      return fail("slug_taken", "That workspace URL is already taken.", 409);
    }
    return fail("email_taken", "An account with that email already exists.", 409);
  }
  return fail("server", "Could not create your account. Please try again.", 502);
}
