import { NextResponse } from "next/server";
import {
  PRESET_SEGMENTS, getPreset, countByRule, sampleByRule,
  listSegments, getSegmentById, createSegment, ruleToDisplay, type RuleGroup,
} from "@/server/repositories/segments";

// TODO: derive org from auth once wired.
const ORG_ID = 1;

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const toMembers = (rows: Awaited<ReturnType<typeof sampleByRule>>) =>
  rows.map((r) => ({
    name: r.displayName || [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email,
    email: r.email,
    spend: `$${Number(r.lifetimeSpend ?? 0).toLocaleString()}`,
    lastOrder: fmtDate(r.lastOrderAt),
  }));

// Resolve a segment id (preset id or "db-<id>") to its rule.
async function resolveRule(id: string): Promise<RuleGroup | null> {
  if (id.startsWith("db-")) {
    const seg = await getSegmentById(Number(id.slice(3)));
    return (seg?.ruleDefinition as RuleGroup) ?? null;
  }
  return getPreset(id)?.def ?? null;
}

// GET /api/segments            → preset + stored segments with live counts
// GET /api/segments?preview=ID → a sample of members for that segment
export async function GET(req: Request) {
  const previewId = new URL(req.url).searchParams.get("preview");
  try {
    if (previewId) {
      const rule = await resolveRule(previewId);
      if (!rule) return NextResponse.json({ ok: false, error: "Segment not found" }, { status: 404 });
      return NextResponse.json({ ok: true, members: toMembers(await sampleByRule(ORG_ID, rule, 20)) });
    }

    const presets = await Promise.all(
      PRESET_SEGMENTS.map(async (s) => ({
        id: s.id, name: s.name, rules: s.rules,
        count: await countByRule(ORG_ID, s.def), status: "ready" as const, preset: true,
      })),
    );
    const storedRows = await listSegments(ORG_ID);
    const stored = await Promise.all(
      storedRows.map(async (s) => ({
        id: `db-${s.id}`, name: s.name, rules: ruleToDisplay(s.ruleDefinition as RuleGroup),
        count: await countByRule(ORG_ID, s.ruleDefinition as RuleGroup), status: "ready" as const, preset: false,
      })),
    );
    return NextResponse.json({ ok: true, segments: [...stored, ...presets] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/segments  { rule }            → live count + sample for the builder
// POST /api/segments  { name, rule, save:true } → create the segment
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rule = body.rule as RuleGroup;
    if (!rule || !Array.isArray(rule.rules)) {
      return NextResponse.json({ ok: false, error: "A rule is required" }, { status: 400 });
    }

    if (body.save) {
      const name = String(body.name || "").trim();
      if (!name) return NextResponse.json({ ok: false, error: "A segment name is required" }, { status: 400 });
      const id = await createSegment(ORG_ID, name, rule);
      return NextResponse.json({ ok: true, id }, { status: 201 });
    }

    const [count, rows] = await Promise.all([
      countByRule(ORG_ID, rule),
      sampleByRule(ORG_ID, rule, 20),
    ]);
    return NextResponse.json({ ok: true, count, members: toMembers(rows) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
