import { NextResponse } from "next/server";
import { PRESET_SEGMENTS, getPreset, countByRule, sampleByRule } from "@/server/repositories/segments";

// TODO: derive org from auth once wired.
const ORG_ID = 1;

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

// GET /api/segments            → all preset segments with live counts
// GET /api/segments?preview=ID  → a sample of members for that segment
export async function GET(req: Request) {
  const previewId = new URL(req.url).searchParams.get("preview");

  try {
    if (previewId) {
      const preset = getPreset(previewId);
      if (!preset) return NextResponse.json({ ok: false, error: "Segment not found" }, { status: 404 });
      const rows = await sampleByRule(ORG_ID, preset.def, 20);
      const members = rows.map((r) => ({
        name: r.displayName || [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email,
        email: r.email,
        spend: `$${Number(r.lifetimeSpend ?? 0).toLocaleString()}`,
        lastOrder: fmtDate(r.lastOrderAt),
      }));
      return NextResponse.json({ ok: true, members });
    }

    const segments = await Promise.all(
      PRESET_SEGMENTS.map(async (s) => ({
        id: s.id,
        name: s.name,
        rules: s.rules,
        count: await countByRule(ORG_ID, s.def),
        status: "ready" as const,
      })),
    );
    return NextResponse.json({ ok: true, segments });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
