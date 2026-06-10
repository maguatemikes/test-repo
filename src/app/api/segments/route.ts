import { NextResponse } from "next/server";

/**
 * Proxy → crm-api /api/segments*. Forwards the session cookie.
 * Keeps the same interface the SegmentsView client expects:
 *   GET            → { segments:[{ id, name, rules[], count, status }] }
 *   GET ?preview=id → { members:[…] }
 *   GET ?edit=id    → { segment:{ id, name, rule } }
 *   POST { rule }   → { count, members }                 (live preview, no save)
 *   POST { name, rule, save, id? } → { ok, id }          (create / update)
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export const dynamic = "force-dynamic";

type Rule = { field: string; op: string; value: string | number };
type RuleGroup = { op: "AND" | "OR"; rules: (Rule | RuleGroup)[] };

const FIELD_LABEL: Record<string, string> = {
  lifetime_spend: "Lifetime Spend", order_count: "Total Orders", last_order_at: "Last Order",
  created_at: "Created", source: "Source", channel: "Channel", primary_channel: "Channel",
  is_subscribed: "Subscribed", last_engagement_at: "Last Engagement",
};
const OP_LABEL: Record<string, string> = { gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "is", ne: "is not" };

function nodeLine(node: Rule | RuleGroup): string {
  if ("rules" in node) {
    const sep = node.op === "OR" ? " OR " : " AND ";
    return `(${node.rules.map(nodeLine).join(sep)})`;
  }
  const f = FIELD_LABEL[node.field] ?? node.field;
  if (node.op === "within_days") return `${f} within ${node.value} days`;
  if (node.op === "older_than_days") return `${f} older than ${node.value} days`;
  const v = node.field === "lifetime_spend" ? `$${Number(node.value).toLocaleString()}` : node.value;
  return `${f} ${OP_LABEL[node.op] ?? node.op} ${v}`;
}
function ruleToDisplay(group: RuleGroup): string[] {
  const out: string[] = [];
  (group.rules || []).forEach((node, i) => {
    const text = nodeLine(node);
    out.push(i > 0 && group.op === "OR" ? `OR: ${text}` : text);
  });
  return out.length ? out : ["All contacts"];
}

const parseRule = (s: unknown): RuleGroup => {
  try { return typeof s === "string" ? JSON.parse(s) : (s as RuleGroup); } catch { return { op: "AND", rules: [] }; }
};
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const toMembers = (rows: Record<string, unknown>[]) =>
  (rows || []).map((r) => ({
    name: (r.DisplayName as string) || (r.Email as string),
    email: r.Email as string,
    spend: `$${Number(r.LifetimeSpend ?? 0).toLocaleString()}`,
    lastOrder: fmtDate((r.LastOrderAt as string) ?? null),
  }));

async function api(cookie: string, path: string, init?: RequestInit) {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    cache: "no-store",
  });
}

export async function GET(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false, segments: [] }, { status: 503 });
  const url = new URL(req.url);
  const editId = url.searchParams.get("edit");
  const previewId = url.searchParams.get("preview");
  const cookie = req.headers.get("cookie") || "";

  try {
    if (editId) {
      const res = await api(cookie, `/segments/${encodeURIComponent(editId)}`);
      if (!res.ok) return NextResponse.json({ ok: false, error: "Not found" }, { status: res.status });
      const s = await res.json();
      return NextResponse.json({ ok: true, segment: { id: String(s.Id), name: s.Name, rule: parseRule(s.RuleDefinition) } });
    }

    if (previewId) {
      const res = await api(cookie, `/segments/${encodeURIComponent(previewId)}/members?pageSize=20`);
      if (!res.ok) return NextResponse.json({ ok: true, members: [] });
      const d = await res.json();
      return NextResponse.json({ ok: true, members: toMembers(d.rows) });
    }

    // list + live counts (crm-api MemberCount is not materialized → compute via preview)
    const res = await api(cookie, `/segments`);
    if (!res.ok) return NextResponse.json({ ok: true, segments: [] });
    const list = await res.json();
    const segments = await Promise.all(
      (list.rows || []).map(async (s: Record<string, unknown>) => {
        const rule = parseRule(s.RuleDefinition);
        let count = Number(s.MemberCount ?? 0);
        try {
          const pr = await api(cookie, `/segments/preview`, { method: "POST", body: JSON.stringify({ ruleDefinition: rule }) });
          if (pr.ok) count = (await pr.json()).count ?? count;
        } catch {}
        return { id: String(s.Id), name: s.Name, rules: ruleToDisplay(rule), count, status: "ready" as const };
      }),
    );
    return NextResponse.json({ ok: true, segments });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!API_BASE) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });
  const cookie = req.headers.get("cookie") || "";
  try {
    const body = await req.json();
    const rule = body.rule;
    if (!rule || !Array.isArray(rule.rules)) return NextResponse.json({ ok: false, error: "A rule is required" }, { status: 400 });

    if (body.save) {
      const name = String(body.name || "").trim();
      if (!name) return NextResponse.json({ ok: false, error: "A segment name is required" }, { status: 400 });
      const payload = JSON.stringify({ name, ruleDefinition: rule });
      const res = body.id
        ? await api(cookie, `/segments/${encodeURIComponent(body.id)}`, { method: "PATCH", body: payload })
        : await api(cookie, `/segments`, { method: "POST", body: payload });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        return NextResponse.json({ ok: false, error: e.message || "Save failed" }, { status: res.status });
      }
      const d = await res.json().catch(() => ({}));
      return NextResponse.json({ ok: true, id: body.id || String(d.Id ?? d.id ?? "") });
    }

    // live preview
    const res = await api(cookie, `/segments/preview`, { method: "POST", body: JSON.stringify({ ruleDefinition: rule }) });
    if (!res.ok) return NextResponse.json({ ok: true, count: 0, members: [] });
    const d = await res.json();
    return NextResponse.json({ ok: true, count: d.count ?? 0, members: toMembers(d.sample) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
