/**
 * crm-api automations client (browser → /api/automations proxy → crm-api).
 * The backend stores a step GRAPH: PATCH sends steps in order (parentStepId
 * null) and crm-api chains + canonicalises them (send_template, delay, …);
 * GET returns { automation, steps } with configJson strings.
 */
export type Automation = {
  id: number;
  name: string;
  description?: string | null;
  status: "draft" | "active" | "paused" | string;
  triggerType: string;
  triggerConfigJson?: string | null;
  enrolledCount?: number;
  completedCount?: number;
  createdAt?: string | null;
};

export type RawStep = { id: number; kind: string; type?: string; branch?: string; parentStepId: number | null; stepOrder: number; configJson?: string | null };
export type StepInput = { kind: string; branch?: string; parentStepId?: number | null; config: Record<string, unknown> };

const parse = (s?: string | null): Record<string, unknown> => { try { return s ? JSON.parse(s) : {}; } catch { return {}; } };

export async function listAutomations(): Promise<Automation[]> {
  try {
    const r = await fetch("/api/automations", { cache: "no-store" });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : (d?.rows ?? []);
  } catch { return []; }
}

export async function getAutomation(id: number): Promise<{ automation: Automation; steps: RawStep[]; triggerConfig: Record<string, unknown> } | null> {
  try {
    const r = await fetch(`/api/automations/${id}`, { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    const automation = (d.automation ?? d) as Automation;
    const steps = (d.steps ?? []) as RawStep[];
    return { automation, steps: steps.slice().sort((a, b) => a.stepOrder - b.stepOrder), triggerConfig: parse(automation.triggerConfigJson) };
  } catch { return null; }
}

export async function createAutomation(input: { name: string; description?: string; triggerType: string; triggerConfig?: Record<string, unknown> }): Promise<{ ok: boolean; id?: number }> {
  const r = await fetch("/api/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const d = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: d.id } : { ok: false };
}

export async function updateAutomation(id: number, input: { name?: string; description?: string; triggerConfig?: Record<string, unknown>; steps?: StepInput[] }): Promise<boolean> {
  const r = await fetch(`/api/automations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  return r.ok;
}

export async function deleteAutomation(id: number): Promise<boolean> { return (await fetch(`/api/automations/${id}`, { method: "DELETE" })).ok; }
export async function activateAutomation(id: number): Promise<boolean> { return (await fetch(`/api/automations/${id}/activate`, { method: "POST" })).ok; }
export async function pauseAutomation(id: number): Promise<boolean> { return (await fetch(`/api/automations/${id}/pause`, { method: "POST" })).ok; }

export const parseConfig = parse;
