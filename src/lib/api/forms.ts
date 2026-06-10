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
      try { const dr = await api(`/forms/${f.Id}`); if (dr.ok) cfg = await dr.json(); } catch {}
      return {
        id: f.Id, name: f.Name, slug: f.Slug, type: f.Type, status: f.Status,
        impressions: f.Impressions, submissions: f.Submissions, targetListId: f.TargetListId,
        fields: parse(cfg.FieldsJson) ?? [],
        design: parse(cfg.DesignJson),
        targeting: parse(cfg.TargetingJson),
        success: parse(cfg.SuccessBehaviorJson),
        updatedAt: fmt((f.CreatedAt as string) ?? null),
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
  return (d.rows || []).map((l: Record<string, unknown>) => ({ id: l.Id as number, name: l.Name as string }));
}
