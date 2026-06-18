/**
 * Automation workflow runner.
 *
 * Drives the n8n-style "moving light" execution: it steps through a linearised
 * plan, emitting a `running` event then a resolved (`completed`/`skipped`/
 * `failed`) event per node, with timing so the canvas can animate.
 *
 * A step's `resolve` may be async — email steps actually send (via the existing
 * campaign test-send path) so real mail lands in the test inbox. Delays are
 * compressed and branch/tag steps are simulated, because the live execution
 * engine (enrollment, real waits, branch evaluation) ships with crm-api —
 * see docs/PROPOSAL_automation_execution_testrun_logging.md. When that lands,
 * route through POST /api/automations/{id}/test + the SSE run-events stream;
 * the event shape here is identical, so the canvas/log UI needs no change.
 */

export type RunStepStatus = "running" | "completed" | "skipped" | "failed";
export type RunEvent = { stepId: string; title: string; status: RunStepStatus; detail: string; ts: number };

/** One node's plan: how to label it while running, and how it resolves (sync or async).
 *  `waitMs` (delay steps) makes the runner pause that long in real time while the
 *  node shows "running" — so a seconds-long delay visibly holds the light. */
export type RunPlanStep = {
  id: string;
  title: string;
  waitMs?: number;
  resolve: () => Promise<{ status: Exclude<RunStepStatus, "running">; detail: string }> | { status: Exclude<RunStepStatus, "running">; detail: string };
};

export type RunHandle = { cancel: () => void };

export const RUN_MODE: "interim" | "real" = "interim";

const DWELL_MS = 550; // minimum visible "running" dwell per node
const GAP_MS = 200; // pause between nodes

/** Run the plan, awaiting each step. Stops on the first failure.
 *  Delay steps (`waitMs`) hold the "running" state for that long in real time,
 *  so a seconds-long delay visibly pauses the moving light. The pause is
 *  cancellable, so Stop interrupts even mid-delay. */
export function runFlow(
  plan: RunPlanStep[],
  onEvent: (e: RunEvent) => void,
  onDone: (ok: boolean) => void,
): RunHandle {
  let cancelled = false;
  let timer: number | null = null;
  const sleep = (ms: number) => new Promise<void>((res) => { timer = window.setTimeout(res, ms); });

  (async () => {
    for (const s of plan) {
      if (cancelled) return;
      onEvent({ stepId: s.id, title: s.title, status: "running", detail: "", ts: Date.now() });
      // For a delay step, dwell = its real (capped) duration; otherwise a short visible beat.
      await sleep(s.waitMs != null ? Math.max(s.waitMs, 300) : DWELL_MS);
      if (cancelled) return;
      let r: { status: Exclude<RunStepStatus, "running">; detail: string };
      try {
        r = await s.resolve();
      } catch (e) {
        r = { status: "failed", detail: (e as Error)?.message || "Step failed" };
      }
      if (cancelled) return;
      onEvent({ stepId: s.id, title: s.title, status: r.status, detail: r.detail, ts: Date.now() });
      if (r.status === "failed") { onDone(false); return; }
      await sleep(GAP_MS);
    }
    if (!cancelled) onDone(true);
  })();

  return { cancel: () => { cancelled = true; if (timer != null) window.clearTimeout(timer); } };
}
