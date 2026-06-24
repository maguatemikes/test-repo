/**
 * crm-api campaigns client (browser → /api/campaigns proxy → crm-api).
 * The API returns raw counts; rate helpers compute %s for the UI.
 */
export type Campaign = {
  id: number;
  name: string;
  subject: string | null;
  preheader: string | null;
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  targetListId: number | null;
  targetSegmentId: number | null;
  excludeSegmentId: number | null;
  templateId: number | null;
  scheduledFor: string | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused" | string;
  recipientCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  unsubscribedCount: number;
  bouncedCount: number;
  complainedCount: number;
  revenue: number;
  sentAt: string | null;
  createdAt: string;
};

export type CampaignInput = {
  name?: string;
  subject?: string;
  preheader?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  targetListId?: number | null;
  targetSegmentId?: number | null;
  excludeSegmentId?: number | null;
  templateId?: number | null;
  scheduledFor?: string | null;
  status?: string;
};

const rows = (d: unknown): Campaign[] => (Array.isArray(d) ? d : (((d as { rows?: Campaign[] })?.rows) ?? []));
const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

/** Open/click/unsub rates computed off delivered (falls back to recipients). */
export function rates(c: Pick<Campaign, "deliveredCount" | "recipientCount" | "openedCount" | "clickedCount" | "unsubscribedCount">) {
  const base = c.deliveredCount || c.recipientCount || 0;
  return { openRate: pct(c.openedCount, base), clickRate: pct(c.clickedCount, base), unsubRate: pct(c.unsubscribedCount, base) };
}

export async function listCampaigns(status?: string): Promise<Campaign[]> {
  const qs = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
  try {
    const r = await fetch(`/api/campaigns${qs}`);
    if (!r.ok) return [];
    return rows(await r.json());
  } catch { return []; }
}

export async function getCampaign(id: number): Promise<Campaign | null> {
  try { const r = await fetch(`/api/campaigns/${id}`); return r.ok ? ((await r.json()) as Campaign) : null; } catch { return null; }
}

export async function getAnalytics(id: number): Promise<Record<string, unknown> | null> {
  try { const r = await fetch(`/api/campaigns/${id}/analytics`); return r.ok ? await r.json() : null; } catch { return null; }
}

export async function createCampaign(input: CampaignInput): Promise<{ ok: boolean; id?: number; error?: string }> {
  const r = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const d = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: d.id } : { ok: false, error: d.error || "Failed to create" };
}

export async function updateCampaign(id: number, input: CampaignInput): Promise<boolean> {
  const r = await fetch(`/api/campaigns/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  return r.ok;
}

export async function deleteCampaign(id: number): Promise<boolean> {
  const r = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
  return r.ok;
}

export async function testCampaign(id: number, emails: string[]): Promise<boolean> {
  const r = await fetch(`/api/campaigns/${id}/test`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails }) });
  return r.ok;
}

export async function sendCampaign(id: number, sendAt?: string | null): Promise<boolean> {
  const r = await fetch(`/api/campaigns/${id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sendAt: sendAt ?? null }) });
  return r.ok;
}

/** Audience options for the composer — lists + segments via their existing proxies. */
export type AudienceOption = { kind: "list" | "segment"; id: number; name: string; count?: number };
export async function listAudiences(): Promise<AudienceOption[]> {
  const get = (p: string) => fetch(p).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const norm = (d: unknown): Record<string, unknown>[] => (Array.isArray(d) ? d : (((d as { rows?: unknown[]; lists?: unknown[]; segments?: unknown[] })?.rows ?? (d as { lists?: unknown[] })?.lists ?? (d as { segments?: unknown[] })?.segments) ?? [])) as Record<string, unknown>[];
  const pick = (o: Record<string, unknown>, ...k: string[]) => { for (const key of k) { const kk = Object.keys(o).find((x) => x.toLowerCase() === key.toLowerCase()); if (kk && o[kk] != null) return o[kk]; } return undefined; };
  const [lists, segs] = await Promise.all([get("/api/lists"), get("/api/segments")]);
  const opts: AudienceOption[] = [];
  for (const l of norm(lists)) opts.push({ kind: "list", id: Number(pick(l, "id")), name: String(pick(l, "name") ?? "List"), count: Number(pick(l, "memberCount", "count") ?? NaN) || undefined });
  for (const sgt of norm(segs)) opts.push({ kind: "segment", id: Number(pick(sgt, "id")), name: String(pick(sgt, "name") ?? "Segment"), count: Number(pick(sgt, "memberCount", "count") ?? NaN) || undefined });
  return opts.filter((o) => !Number.isNaN(o.id));
}
