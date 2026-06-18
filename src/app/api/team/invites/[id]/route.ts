import { NextResponse } from "next/server";

/**
 * DELETE /api/team/invites/:id → crm-api `DELETE /invites/:id`.
 * Revokes a pending invite. Forwards the caller's session cookie so crm-api
 * can authorize (owner/admin-only).
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Ctx) {
  if (!API_BASE) {
    return NextResponse.json({ ok: false, error: "Team service is not configured (set NETX_API_BASE_URL)." }, { status: 503 });
  }
  const { id } = await params;

  try {
    const cookie = req.headers.get("cookie");
    const upstream = await fetch(`${API_BASE}/invites/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { ...(cookie ? { cookie } : {}) },
      redirect: "manual",
    });
    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({} as Record<string, unknown>));
      return NextResponse.json(
        { ok: false, error: (data.message as string) || (data.error as string) || "Could not revoke invite.", code: data.code },
        { status: upstream.status },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach the team service." }, { status: 502 });
  }
}
