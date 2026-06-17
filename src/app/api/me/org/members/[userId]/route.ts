import { NextResponse } from "next/server";

/**
 * Member mutations for the caller's organization, proxied to crm-api.
 *   PATCH  /api/me/org/members/:userId  → change a member's role
 *   DELETE /api/me/org/members/:userId  → remove a member
 *
 * Both forward the session cookie so crm-api enforces authorization
 * (owner/super_admin-only mutations). Role is validated here against the same
 * fixed ENUM the database uses; the authoritative check still lives upstream.
 *
 * Note: "disable" (deactivate without removing) is intentionally not
 * implemented — crm_organization_members has no status column, so it would need
 * a schema migration. Removal is a hard delete of the membership.
 */
const API_BASE = process.env.NETX_API_BASE_URL;
const ROLES = new Set(["super_admin", "admin", "marketing_manager", "analyst", "read_only"]);

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ userId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!API_BASE) {
    return NextResponse.json({ ok: false, error: "Team service is not configured (set NETX_API_BASE_URL)." }, { status: 503 });
  }
  const { userId } = await params;

  let body: { role?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 }); }

  const role = (body.role || "").trim();
  if (!ROLES.has(role)) return NextResponse.json({ ok: false, error: "A valid role is required." }, { status: 400 });

  try {
    const cookie = req.headers.get("cookie");
    const upstream = await fetch(`${API_BASE}/me/org/members/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ role }),
      redirect: "manual",
    });
    const data = await upstream.json().catch(() => ({} as Record<string, unknown>));
    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: (data.message as string) || (data.error as string) || "Role update failed.", code: data.code },
        { status: upstream.status },
      );
    }
    return NextResponse.json({ ok: true, ...(data as object) });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the team service." }, { status: 502 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!API_BASE) {
    return NextResponse.json({ ok: false, error: "Team service is not configured (set NETX_API_BASE_URL)." }, { status: 503 });
  }
  const { userId } = await params;

  try {
    const cookie = req.headers.get("cookie");
    const upstream = await fetch(`${API_BASE}/me/org/members/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { ...(cookie ? { cookie } : {}) },
      redirect: "manual",
    });
    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({} as Record<string, unknown>));
      return NextResponse.json(
        { ok: false, error: (data.message as string) || (data.error as string) || "Remove failed.", code: data.code },
        { status: upstream.status },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the team service." }, { status: 502 });
  }
}
