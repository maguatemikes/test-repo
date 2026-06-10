import { NextResponse } from "next/server";

/**
 * Proxy → crm-api /api/lists*. Forwards the session cookie.
 * Same interface ListsView expects:
 *   GET            → { lists:[{ id,name,description,source,count,created,updated }] }
 *   GET ?members=id → { members:[{ id,name,email,source,joined }] }
 *   GET ?search=q   → { candidates:[{ id,name,email }] }   (customer search to add)
 *   POST { name }                          → { ok, id }
 *   POST { action:add|remove, listId, customerId } → { ok }
 *   DELETE ?id=id                          → { ok }
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

async function api(cookie: string, path: string, init?: RequestInit) {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    cache: "no-store",
  });
}

export async function GET(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false, lists: [] }, { status: 503 });
  const url = new URL(req.url);
  const membersId = url.searchParams.get("members");
  const search = url.searchParams.get("search");
  const cookie = req.headers.get("cookie") || "";

  try {
    if (membersId) {
      const res = await api(cookie, `/lists/${encodeURIComponent(membersId)}/members?pageSize=200`);
      if (!res.ok) return NextResponse.json({ ok: true, members: [] });
      const d = await res.json();
      return NextResponse.json({
        ok: true,
        members: (d.rows || []).map((r: Record<string, unknown>) => ({
          id: r.Id, name: (r.DisplayName as string) || (r.Email as string), email: r.Email,
          source: "manual", joined: fmtDate((r.AddedAt as string) ?? null),
        })),
      });
    }
    if (search !== null) {
      const res = await api(cookie, `/customers?q=${encodeURIComponent(search)}&pageSize=10`);
      if (!res.ok) return NextResponse.json({ ok: true, candidates: [] });
      const d = await res.json();
      return NextResponse.json({
        ok: true,
        candidates: (d.rows || []).map((r: Record<string, unknown>) => ({
          id: r.id, name: (r.displayName as string) || (r.email as string), email: r.email,
        })),
      });
    }
    const res = await api(cookie, `/lists`);
    if (!res.ok) return NextResponse.json({ ok: true, lists: [] });
    const d = await res.json();
    return NextResponse.json({
      ok: true,
      lists: (d.rows || []).map((l: Record<string, unknown>) => ({
        id: l.Id, name: l.Name, description: (l.Description as string) || "", source: (l.Source as string) || "manual",
        count: Number(l.MemberCount ?? 0), created: fmtDate((l.CreatedAt as string) ?? null), updated: fmtDate((l.CreatedAt as string) ?? null),
      })),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  try {
    const body = await req.json();

    if (body.action === "add" || body.action === "remove") {
      const listId = Number(body.listId), customerId = Number(body.customerId);
      if (!listId || !customerId) return NextResponse.json({ ok: false, error: "listId and customerId are required" }, { status: 400 });
      const res = body.action === "add"
        ? await api(cookie, `/lists/${listId}/members`, { method: "POST", body: JSON.stringify({ customerId }) })
        : await api(cookie, `/lists/${listId}/members/${customerId}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: res.status }); }
      return NextResponse.json({ ok: true });
    }

    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "A list name is required" }, { status: 400 });
    const res = await api(cookie, `/lists`, { method: "POST", body: JSON.stringify({ name, description: body.description }) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: res.status }); }
    const d = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: true, id: d.Id ?? d.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  try {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    const res = await api(cookie, `/lists/${id}`, { method: "DELETE" });
    if (!res.ok) return NextResponse.json({ ok: false, error: "Delete failed" }, { status: res.status });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
