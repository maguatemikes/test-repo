import { cookies } from "next/headers";
import type { FormRow } from "@/components/pages-components/FormsView";

/** crm-api client for forms (server-only). Forwards the session cookie. */
const API_BASE = process.env.NETX_API_BASE_URL;

const parse = (s: unknown) => { try { return typeof s === "string" ? JSON.parse(s) : s; } catch { return null; } };
const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

async function api(path: string) {
  const cookie = (await cookies()).toString();
  return fetch(`${API_BASE}${path}`, { headers: cookie ? { cookie } : {}, cache: "no-store" });
}

/** Forms list with full builder config (list summary + per-form detail). */
export async function fetchForms(): Promise<FormRow[]> {
  if (!API_BASE) return [];
  const res = await api(`/forms`);
  if (!res.ok) return [];
  const d = await res.json();
  return Promise.all(
    (d.rows || []).map(async (f: Record<string, unknown>) => {
      let cfg: Record<string, unknown> = {};
      try { const dr = await api(`/forms/${f.id}`); if (dr.ok) cfg = await dr.json(); } catch {}
      return {
        id: f.id, name: f.name, slug: f.slug, type: f.type, status: f.status,
        impressions: f.impressions, submissions: f.submissions, targetListId: f.targetListId,
        fields: parse(cfg.fieldsJson) ?? [],
        design: parse(cfg.designJson),
        targeting: parse(cfg.targetingJson),
        success: parse(cfg.successBehaviorJson),
        updatedAt: fmt((f.createdAt as string) ?? null),
      } as FormRow;
    }),
  );
}

/** Lists for the target-list dropdown. */
export async function fetchFormLists(): Promise<{ id: number; name: string }[]> {
  if (!API_BASE) return [];
  const res = await api(`/lists`);
  if (!res.ok) return [];
  const d = await res.json();
  return (d.rows || []).map((l: Record<string, unknown>) => ({ id: l.id as number, name: l.name as string }));
}
