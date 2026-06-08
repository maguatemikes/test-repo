import { NextResponse } from "next/server";
import {
  listListsWithCounts, getListMembersDetailed, createList, deleteList, addMember, removeMember,
} from "@/server/repositories/lists";
import { searchCustomers } from "@/server/repositories/customers";

// TODO: derive org from auth once wired.
const ORG_ID = 1;

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const nameOf = (r: { displayName?: string | null; firstName?: string | null; lastName?: string | null; email: string }) =>
  r.displayName || [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email;

// GET /api/lists                 → lists with live counts
// GET /api/lists?members=<id>    → a list's members
// GET /api/lists?search=<q>      → customers to add (id/name/email)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const membersId = url.searchParams.get("members");
  const search = url.searchParams.get("search");

  try {
    if (membersId) {
      const rows = await getListMembersDetailed(Number(membersId));
      return NextResponse.json({
        ok: true,
        members: rows.map((r) => ({
          id: r.id, name: nameOf(r), email: r.email, source: r.source || "manual", joined: fmtDate(r.addedAt),
        })),
      });
    }
    if (search !== null) {
      const { rows } = await searchCustomers(ORG_ID, { q: search, limit: 10 });
      return NextResponse.json({
        ok: true,
        candidates: rows.map((r) => ({ id: r.id, name: nameOf(r), email: r.email })),
      });
    }
    const rows = await listListsWithCounts(ORG_ID);
    return NextResponse.json({
      ok: true,
      lists: rows.map((l) => ({
        id: l.id, name: l.name, description: l.description || "", source: l.source || "manual",
        count: Number(l.count), created: fmtDate(l.createdAt), updated: fmtDate(l.createdAt),
      })),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/lists  { name, description }                 → create a list
// POST /api/lists  { action:"add"|"remove", listId, customerId } → member ops
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "add" || body.action === "remove") {
      const listId = Number(body.listId);
      const customerId = Number(body.customerId);
      if (!listId || !customerId) return NextResponse.json({ ok: false, error: "listId and customerId are required" }, { status: 400 });
      if (body.action === "add") await addMember(listId, customerId);
      else await removeMember(listId, customerId);
      return NextResponse.json({ ok: true });
    }

    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "A list name is required" }, { status: 400 });
    const id = await createList(ORG_ID, name, { description: body.description });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// DELETE /api/lists?id=<id>  → delete a list (and its membership)
export async function DELETE(req: Request) {
  try {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    await deleteList(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
