# Proposal: Automation Execution, Live Test-Run & Run Logging (crm-api)

**Status:** Draft for crm-api review
**Scope:** Backend / API layer. Defines the execution runtime, a real-time test-run, and run/step logging. Frontend consumption (the n8n-style moving-light canvas and the published run-log viewer) is downstream and described only for context (§10).

---

## 1. Problem

The automation **builder** is complete: the step graph (`send_template`, `delay`, `branch`, `tag`) persists via `POST/PATCH /api/automations/{id}` and `Activate`/`Pause` flip status. But:

- There is **no execution runtime** — an activated automation does not actually enrol contacts or run steps.
- There is **no test-run** — you cannot execute an automation once against a test recipient to verify it.
- There are **no run/step logs** — `GET /api/automations/{id}/stats` returns aggregate counts only; there is no per-run, per-step record.

As a result the UI cannot offer a real "test this automation" button, cannot show a live execution (the moving-light visual), and cannot show a published automation's "what's happening" log. The only real send path today is campaign test-send, which is unsuitable for stepping through an automation.

This proposal specifies the three capabilities needed: **(A) execution runtime, (B) live test-run, (C) run logging** — with a real-time event stream so the canvas can highlight steps as they execute.

## 2. Goals

1. **Execute** published automations: enrol contacts on trigger, run the step graph, run continuously until paused.
2. **Test-run** an automation once, in real time, against a **test recipient** (e.g. `maguatemikes@gmail.com`): real email sends, **compressed delays**, deterministic branch handling, **no live audience**.
3. **Log** every run and step (test and live) so the UI can show a live moving-light and a published run history with per-step status and errors.
4. Stream step events in real time for the canvas.

Non-goals: visual builder changes (done), analytics dashboards beyond run logs.

## 3. Capability A — Execution runtime

### Step semantics
| Kind | Behaviour |
|---|---|
| `send_template` | Render template (`templateId`, optional `subject` override) and send to the enrolled contact, from the automation/org sender. |
| `delay` | Wait `amount` × `unit` (minutes/hours/days), then continue. |
| `branch` | Evaluate `condition` against the contact (e.g. `opened_previous`, tag membership); route down the matching edge. |
| `tag` | Apply/remove the configured tag on the contact. |

### Enrollment & states
- On trigger match, create an **enrollment** (one contact's journey through the automation).
- Each enrollment advances through steps; persist per-step state: `pending → running → completed | skipped | failed`.
- Continuous: new matching contacts enrol on an ongoing basis until the automation is paused.

## 4. Capability B — Live test-run

### Endpoint
```
POST /api/automations/{id}/test
body: { "testEmail": "maguatemikes@gmail.com", "sampleContactId": 123 | null }
→ 202 { "runId": "..." }
```

### Test-mode semantics (must differ from live)
- **Email steps:** render and **really send** to `testEmail` (so the inbox receives each step). No live audience is touched.
- **Delay steps:** **compressed** — do not wait real hours/days; advance after a short bounded pause (e.g. ≤2s) and record `skippedDelay: "2 days"`.
- **Branch steps:** evaluate against `sampleContactId` if provided; otherwise mark the branch **undetermined** and follow a caller-selected/default edge (the run record notes which path was taken and why).
- **Tag steps:** in test mode, **do not mutate** real contacts — record "would tag: engaged" instead.
- The whole run completes in seconds and emits the same step events as a live run (so the canvas animation is identical).

This is the same endpoint shape that production test tooling grows into; it does not require the live audience to exist.

## 5. Capability C — Run logging + real-time events

### Run history
```
GET /api/automations/{id}/runs?type=test|live&limit=50
→ [ { runId, type, status, contactRef|testEmail, startedAt, finishedAt, stepsTotal, stepsCompleted, error? } ]

GET /api/automations/{id}/runs/{runId}
→ { runId, type, status, steps: [
     { stepId, kind, status, startedAt, finishedAt, detail, error? }  // detail e.g. "sent template 3", "skipped 2 days", "branch → yes"
   ] }
```

### Real-time event stream (for the moving light)
```
GET /api/automations/{id}/runs/{runId}/events    (Server-Sent Events)
event: step
data: { "stepId": "...", "status": "running|completed|skipped|failed", "ts": "...", "detail": "..." }
event: done
data: { "status": "completed|failed" }
```
SSE is preferred so the canvas can light each node the instant it executes. Polling `GET …/runs/{runId}` is an acceptable fallback if SSE is not feasible.

## 6. Data model (proposed `crm_*` tables)

```
crm_automation_runs
  id            PK (runId)
  automation_id FK
  type          enum('test','live')
  status        enum('running','completed','failed','cancelled')
  contact_id    FK nullable          -- live
  test_email    text nullable        -- test
  started_at, finished_at, error

crm_automation_run_steps
  id            PK
  run_id        FK
  step_id       ref to automation step
  kind          text
  status        enum('pending','running','completed','skipped','failed')
  detail        text                 -- human log line
  started_at, finished_at, error

crm_automation_enrollments  (live)
  id, automation_id, contact_id, current_step_id, status, enrolled_at
```

## 7. Cross-cutting

- **Auth:** all endpoints session/org-scoped; runs are org-isolated.
- **Idempotency:** test-run accepts an optional idempotency key to avoid duplicate sends on retry.
- **Rate limiting:** cap test-runs per automation/min; cap test emails per address.
- **Safety:** test-mode must never enrol or email the live audience; enforce server-side, not just by client flag.
- **Validation:** reject a test/activate on an invalid graph (no trigger, email step missing template, dangling branch) with a structured error the UI can show.

## 8. Phased rollout

1. **Runtime (A)** — enrolment + step execution for live automations.
2. **Test-run (B)** — `POST /{id}/test`, real send to test email, compressed delays.
3. **Run logging (C)** — `GET /{id}/runs`, `/{id}/runs/{runId}`.
4. **SSE events** — `/{id}/runs/{runId}/events` for the live moving-light.

## 9. Acceptance criteria

- `POST /api/automations/{id}/test { testEmail }` runs the graph end-to-end in seconds: each email step is received at `testEmail`, delays are compressed, branches resolved deterministically, no live contact is enrolled or tagged.
- The run and every step are retrievable via `GET …/runs` and `GET …/runs/{runId}` with accurate status, timing, and a human-readable `detail` per step.
- The SSE stream emits a `step` event per node transition in real time and a terminal `done` event.
- A published (active) automation enrols matching contacts and runs them through the steps continuously until paused, with each run/step logged identically to test runs.
- Test-mode isolation is enforced server-side.

## 10. Downstream (frontend) impact — for awareness only

With these endpoints, the builder gains: a **"Test run"** button that drives the n8n-style **moving-light** animation off the SSE events while a real email arrives at the test inbox; and, for published automations, a **run-log viewer** showing real per-step history and errors. No backend work beyond this proposal is requested from the frontend side; the frontend consumes the contract above.
