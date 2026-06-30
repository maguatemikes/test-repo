// Client for the server-side automation run + execution log (the n8n-style
// engine). `testRun` fires a real server execution; `getExecution` returns the
// per-step status that drives the canvas + Executions view. Replaces the old
// browser-only simulation (src/lib/automationRun.ts) for the Execute button.

export type ExecStep = {
  stepOrder: number;
  stepKind: string;
  status: string; // pending | running | waiting | active | completed | skipped | failed
  detail?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type Execution = {
  executionId: string;
  runId?: number;
  automationId?: number;
  contact?: string;
  mode?: string; // test | live
  status?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  steps?: ExecStep[];
};

export type ExecRow = {
  executionId: string;
  runId?: number;
  contact?: string;
  mode?: string;
  status?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

/** Fire a server-side test run. Returns the executionId to poll. */
export async function testRun(
  automationId: number,
  email: string,
  compressWaits = true,
): Promise<{ ok: boolean; executionId?: string; error?: string }> {
  try {
    const r = await fetch(`/api/automations/${automationId}/test-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, compressWaits }),
    });
    const d = (await r.json().catch(() => ({}))) as { ok?: boolean; executionId?: string; runId?: number; code?: string; message?: string };
    if (!r.ok || d.ok === false) {
      if (r.status === 401) return { ok: false, error: "Your session expired — sign in again." };
      return { ok: false, error: d.message || d.code || `Run failed (${r.status}). The test address may already be enrolled — try another.` };
    }
    const id = d.executionId ?? (d.runId != null ? String(d.runId) : undefined);
    return id ? { ok: true, executionId: id } : { ok: false, error: "Run started but no executionId was returned." };
  } catch {
    return { ok: false, error: "Network error starting the run." };
  }
}

/** Per-run detail with each step's status. */
export async function getExecution(executionId: string): Promise<Execution | null> {
  try {
    const r = await fetch(`/api/executions/${executionId}`, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as Execution;
  } catch {
    return null;
  }
}

/** Run history for an automation (newest first). */
export async function listExecutions(automationId: number): Promise<ExecRow[]> {
  try {
    const r = await fetch(`/api/automations/${automationId}/executions`, { cache: "no-store" });
    if (!r.ok) return [];
    const d = await r.json();
    const rows: ExecRow[] = d.rows ?? (Array.isArray(d) ? d : []);
    return rows.slice().sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
  } catch {
    return [];
  }
}

/** Map a backend execution status → the canvas RunStepStatus. */
export function mapExecStatus(s: string): "running" | "completed" | "failed" | "skipped" {
  if (s === "completed") return "completed";
  if (s === "failed") return "failed";
  if (s === "skipped") return "skipped";
  return "running"; // pending | running | waiting | active
}

export const STEP_KIND_LABEL: Record<string, string> = {
  enrollment: "Trigger",
  send_template: "Send email",
  delay: "Wait",
  branch: "Branch",
  tag: "Tag",
  completed: "Done",
};
