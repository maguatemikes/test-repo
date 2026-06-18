"use client";

import { Zap, Plus, Play, Pause, Clock, GitBranch, Mail, Tag, Trash2, X, Check, Loader2, FlaskConical } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { ReactFlow, Background, Controls, MiniMap, Panel, Handle, Position, BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow, addEdge, useNodesState, useEdgesState, type Node, type Edge, type Connection, type NodeProps, type EdgeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { listTemplates, type Template } from "@/lib/templates";
import { listAutomations, getAutomation, createAutomation, updateAutomation, activateAutomation, pauseAutomation, parseConfig, type Automation, type StepInput } from "@/lib/automations";
import { createCampaign, deleteCampaign } from "@/lib/campaigns";
import { runFlow, type RunEvent, type RunStepStatus, type RunPlanStep, type RunHandle } from "@/lib/automationRun";

const TEST_EMAIL_DEFAULT = "maguatemikes@gmail.com";
// Delay units → milliseconds (seconds let you watch a test run in real time).
const UNIT_MS: Record<string, number> = { seconds: 1000, minutes: 60_000, hours: 3_600_000, days: 86_400_000 };
const MAX_TEST_WAIT_MS = 60_000; // a test run honors delays up to 60s real-time; longer ones compress.

/**
 * Real send for an email step. There's no template-level send endpoint yet, so
 * we send via a throwaway campaign (the existing, working test-send path) and
 * delete it after. Interim until crm-api ships the automation test-run endpoint.
 * `subject` must be non-blank — the API rejects blank-subject sends (5.7.1).
 */
async function sendTemplateToTest(templateId: number, subject: string, email: string): Promise<{ ok: boolean; error?: string }> {
  const c = await createCampaign({ name: `[workflow test] ${new Date().toISOString().slice(0, 19)}`, templateId, fromEmail: "no-reply@crm.netx.cc", subject });
  if (!c.ok || c.id == null) return { ok: false, error: c.error || "couldn't create test send" };
  try {
    const res = await fetch(`/api/campaigns/${c.id}/test`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ emails: [email] }) });
    const d = await res.json().catch(() => ({} as Record<string, unknown>));
    deleteCampaign(c.id).catch(() => {}); // best-effort cleanup
    if (res.ok && (d.ok === true || Number(d.sent ?? 0) > 0)) return { ok: true };
    const err = Array.isArray(d.errors) && d.errors[0] ? String(d.errors[0]) : String(d.error ?? `sent ${d.sent ?? 0}`);
    return { ok: false, error: err };
  } catch (e) {
    deleteCampaign(c.id).catch(() => {});
    return { ok: false, error: (e as Error)?.message || "send failed" };
  }
}
// Visual treatment for a node's live run state (the "moving light").
const RUN_RING: Record<RunStepStatus, string> = { running: "#F59E0B", completed: "#22C55E", skipped: "#CBD5E1", failed: "#EF4444" };
function RunBadge({ state }: { state: RunStepStatus }) {
  const icon = state === "completed" ? <Check size={11} /> : state === "failed" ? <X size={11} /> : state === "running" ? <Loader2 size={11} className="nx-spin" /> : <Clock size={10} />;
  return (
    <span style={{ position: "absolute", top: -7, right: -7, width: 18, height: 18, borderRadius: 999, background: RUN_RING[state], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(15,23,42,0.25)" }}>{icon}</span>
  );
}

const statusConfig: Record<string, { bg: string; color: string; dot: string }> = {
  active: { bg: "#F0FDF4", color: "#15803D", dot: "#22C55E" },
  paused: { bg: "#FFF7ED", color: "#C2410C", dot: "#F97316" },
  draft: { bg: "#F8FAFC", color: "#475569", dot: "#94A3B8" },
};

type StepType = "email" | "wait" | "branch" | "tag";

const TRIGGERS = [
  { value: "contact_added", label: "Contact added" },
  { value: "form_submitted", label: "Form submitted" },
  { value: "added_to_cart", label: "Added to cart" },
  { value: "purchase_completed", label: "Purchase completed" },
];
const CONDITIONS = [
  { value: "opened_previous", label: "Opened previous email" },
  { value: "clicked_previous", label: "Clicked a link" },
  { value: "made_purchase", label: "Made a purchase" },
];
const STEP_CATALOG: { type: StepType; label: string; desc: string; icon: typeof Mail; color: string; bg: string }[] = [
  { type: "email", label: "Send email", desc: "Deliver a template", icon: Mail, color: "#2563EB", bg: "#EFF6FF" },
  { type: "wait", label: "Wait", desc: "Delay before the next step", icon: Clock, color: "#0EA5E9", bg: "#F0F9FF" },
  { type: "branch", label: "Condition", desc: "Split the path on a rule", icon: GitBranch, color: "#F59E0B", bg: "#FFFBEB" },
  { type: "tag", label: "Add tag", desc: "Tag the contact", icon: Tag, color: "#7C3AED", bg: "#F5F3FF" },
];
const stepMeta = (t: StepType) => STEP_CATALOG.find((s) => s.type === t)!;
const stepKicker = (t: StepType) => (t === "wait" ? "DELAY" : t === "branch" ? "CONDITION" : "ACTION");
const defaultConfig = (t: StepType): Record<string, unknown> =>
  t === "email" ? { templateId: null, subject: "" } :
  t === "wait" ? { amount: 1, unit: "days" } :
  t === "branch" ? { condition: "opened_previous" } :
  { tag: "" };

// Map between our node types and crm-api step kinds (it canonicalises on save).
const KIND_BY_TYPE: Record<StepType, string> = { email: "send_template", wait: "delay", branch: "branch", tag: "tag" };
const typeByKind = (kind: string): StepType =>
  /template|email/i.test(kind) ? "email" : /delay|wait/i.test(kind) ? "wait" : /branch|condition|split/i.test(kind) ? "branch" : "tag";
const prettyTrigger = (t: string) => TRIGGERS.find((x) => x.value === t)?.label ?? t;

/* ---- Pre-defined automations (only steps the API can store: send/wait/branch/tag) ---- */
type PresetStep = { type: StepType; config?: Record<string, unknown> };
type AutomationPreset = { key: string; name: string; description: string; triggerType: string; delayMin?: number; steps: PresetStep[] };

const AUTOMATION_PRESETS: AutomationPreset[] = [
  { key: "welcome", name: "Welcome Series", description: "Greet new contacts, then nurture the engaged ones.", triggerType: "contact_added",
    steps: [{ type: "email" }, { type: "wait", config: { amount: 2, unit: "days" } }, { type: "branch", config: { condition: "opened_previous" } }, { type: "email" }, { type: "tag", config: { tag: "engaged" } }] },
  { key: "cart", name: "Abandoned Cart Recovery", description: "Win back shoppers who added to cart but didn't buy.", triggerType: "added_to_cart",
    steps: [{ type: "wait", config: { amount: 1, unit: "hours" } }, { type: "email" }, { type: "wait", config: { amount: 1, unit: "days" } }, { type: "branch", config: { condition: "made_purchase" } }, { type: "email" }, { type: "tag", config: { tag: "cart-recovered" } }] },
  { key: "postpurchase", name: "Post-Purchase Upsell", description: "Thank buyers and suggest the next product.", triggerType: "purchase_completed",
    steps: [{ type: "email" }, { type: "wait", config: { amount: 5, unit: "days" } }, { type: "email" }, { type: "tag", config: { tag: "repeat-target" } }] },
  { key: "leadmagnet", name: "Lead Magnet Follow-up", description: "Deliver an asset from a form, then follow up.", triggerType: "form_submitted",
    steps: [{ type: "email" }, { type: "wait", config: { amount: 3, unit: "days" } }, { type: "branch", config: { condition: "clicked_previous" } }, { type: "email" }, { type: "tag", config: { tag: "lead-nurtured" } }] },
  { key: "nurture", name: "New Subscriber Nurture", description: "A 3-email drip to onboard new subscribers.", triggerType: "contact_added",
    steps: [{ type: "email" }, { type: "wait", config: { amount: 2, unit: "days" } }, { type: "email" }, { type: "wait", config: { amount: 3, unit: "days" } }, { type: "email" }, { type: "tag", config: { tag: "onboarded" } }] },
  { key: "firstvip", name: "First-Purchase VIP", description: "Tag first-time buyers and ask for a review.", triggerType: "purchase_completed",
    steps: [{ type: "tag", config: { tag: "customer" } }, { type: "wait", config: { amount: 1, unit: "days" } }, { type: "email" }] },
  { key: "doubleoptin", name: "Double Opt-In Confirmation", description: "Confirm new form signups, then tag the verified ones.", triggerType: "form_submitted",
    steps: [{ type: "email" }, { type: "branch", config: { condition: "clicked_previous" } }, { type: "tag", config: { tag: "confirmed" } }] },
  { key: "review", name: "Product Review Request", description: "Ask recent buyers for a review a week after they buy.", triggerType: "purchase_completed",
    steps: [{ type: "wait", config: { amount: 10, unit: "days" } }, { type: "email" }, { type: "tag", config: { tag: "review-requested" } }] },
  { key: "replenish", name: "Replenishment Reminder", description: "Nudge buyers to reorder before they run out.", triggerType: "purchase_completed",
    steps: [{ type: "wait", config: { amount: 45, unit: "days" } }, { type: "email" }, { type: "tag", config: { tag: "reorder-nudged" } }] },
  { key: "cart3", name: "Cart Recovery — 3-Touch", description: "Three escalating reminders to recover an abandoned cart.", triggerType: "added_to_cart",
    steps: [{ type: "wait", config: { amount: 1, unit: "hours" } }, { type: "email" }, { type: "wait", config: { amount: 1, unit: "days" } }, { type: "branch", config: { condition: "made_purchase" } }, { type: "email" }, { type: "wait", config: { amount: 2, unit: "days" } }, { type: "email" }, { type: "tag", config: { tag: "cart-recovered" } }] },
  { key: "journey", name: "Advanced User Journey", description: "Full lifecycle — onboard, branch on engagement, nurture, then tag for sales.", triggerType: "contact_added",
    steps: [
      { type: "email" },
      { type: "wait", config: { amount: 2, unit: "days" } },
      { type: "branch", config: { condition: "opened_previous" } },
      { type: "email" },
      { type: "wait", config: { amount: 3, unit: "days" } },
      { type: "branch", config: { condition: "clicked_previous" } },
      { type: "tag", config: { tag: "engaged-lead" } },
      { type: "email" },
      { type: "wait", config: { amount: 5, unit: "days" } },
      { type: "email" },
      { type: "tag", config: { tag: "nurtured" } },
    ] },
];

const shortStep = (t: StepType) => (t === "email" ? "Email" : t === "wait" ? "Wait" : t === "branch" ? "If" : "Tag");

function presetToNodes(p: AutomationPreset): Node[] {
  const trigger: Node = { id: "trigger", type: "trigger", position: { x: 250, y: 24 }, deletable: false, data: { triggerType: p.triggerType, delayMin: p.delayMin ?? 0 } };
  const steps: Node[] = p.steps.map((s, i) => ({ id: `s${i + 1}`, type: "step", position: { x: 250, y: 190 + i * 150 }, data: { stepType: s.type, config: { ...defaultConfig(s.type), ...(s.config ?? {}) } } }));
  return [trigger, ...steps];
}
function presetToEdges(p: AutomationPreset): Edge[] {
  const e: Edge[] = []; let prev = "trigger";
  p.steps.forEach((_, i) => { const sid = `s${i + 1}`; e.push({ id: `e-${prev}-${sid}`, source: prev, target: sid, type: "deletable" }); prev = sid; });
  return e;
}

export function AutomationsView() {
  const [items, setItems] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [preset, setPreset] = useState<AutomationPreset | null>(null);
  const [picker, setPicker] = useState(false);

  const load = () => { setLoading(true); listAutomations().then((a) => { setItems(a); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const toggleStatus = async (a: Automation, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = a.status === "active" ? await pauseAutomation(a.id) : await activateAutomation(a.id);
    if (ok) load();
  };

  if (editing !== null) {
    return <FlowCanvas id={editing === "new" ? null : editing} preset={editing === "new" ? preset : null} onBack={() => { setEditing(null); setPreset(null); load(); }} />;
  }

  const activeCount = items.filter((a) => a.status === "active").length;

  return (
    <div className="p-6 space-y-4" style={{ fontFamily: font }}>
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, color: "#64748B" }}>
          <strong style={{ color: "#0F172A" }}>{items.length}</strong> automation{items.length === 1 ? "" : "s"} · <strong style={{ color: "#16A34A" }}>{activeCount}</strong> active
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPicker(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#F1F5F9", color: "#64748B", border: "1px solid var(--border)", cursor: "pointer" }}>
            Browse templates
          </button>
          <button onClick={() => { setPreset(null); setEditing("new"); }} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
            <Plus size={13} /> New Automation
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#94A3B8" }}>Loading automations…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl flex flex-col items-center justify-center text-center" style={{ minHeight: 260, border: "1.5px dashed var(--border)", background: "#FFFFFF" }}>
          <div className="rounded-full flex items-center justify-center" style={{ width: 46, height: 46, background: "#F5F3FF", marginBottom: 14 }}><Zap size={18} color="#7C3AED" /></div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>No automations yet</p>
          <p style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4, marginBottom: 14 }}>Build a triggered flow that runs on autopilot.</p>
          <button onClick={() => { setPreset(null); setEditing("new"); }} className="rounded-lg px-4 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>Create your first automation</button>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => {
            const sc = statusConfig[a.status] ?? statusConfig.draft;
            const enrolled = a.enrolledCount ?? 0, completed = a.completedCount ?? 0;
            const conv = enrolled > 0 ? `${((completed / enrolled) * 100).toFixed(1)}%` : "—";
            return (
              <div key={a.id} className="rounded-xl p-4 cursor-pointer" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
                onClick={() => setEditing(a.id)}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563EB")} onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                <div className="flex items-start justify-between mb-3">
                  <div className="rounded-lg flex items-center justify-center" style={{ width: 36, height: 36, background: sc.bg }}><Zap size={16} color={sc.color} /></div>
                  <span className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5" style={{ fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color }}>
                    <span className="rounded-full" style={{ width: 5, height: 5, background: sc.dot, display: "inline-block" }} />
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </span>
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 3 }}>{a.name}</h3>
                <p style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>Trigger: {prettyTrigger(a.triggerType)}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: "Enrolled", value: enrolled.toLocaleString() }, { label: "Completed", value: completed.toLocaleString() }, { label: "Conversion", value: conv }].map((m) => (
                    <div key={m.label} className="rounded-lg p-2.5" style={{ background: "#F8FAFC" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{m.value}</p>
                      <p style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{m.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid #F1F5F9" }}>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>{a.createdAt ? `Created ${new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Draft"}</span>
                  {a.status !== "draft" && (
                    <button onClick={(e) => toggleStatus(a, e)} title={a.status === "active" ? "Pause" : "Activate"} style={{ color: "#94A3B8", cursor: "pointer", background: "transparent", border: "none" }}>
                      {a.status === "active" ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Browse-templates picker */}
      {picker && (
        <div onClick={() => setPicker(false)} className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(15,23,42,0.45)", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} className="rounded-2xl overflow-y-auto" style={{ width: 720, maxWidth: "100%", maxHeight: "86%", background: "#FFFFFF", boxShadow: "0 24px 60px rgba(15,23,42,0.30)" }}>
            <div className="flex items-center justify-between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Start from a template</p>
                <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Pre-built flows you can tweak — then save.</p>
              </div>
              <button onClick={() => setPicker(false)} title="Close" style={{ color: "#94A3B8", cursor: "pointer", background: "transparent", border: "none" }}><X size={18} /></button>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2" style={{ padding: 20 }}>
              {AUTOMATION_PRESETS.map((p) => (
                <button key={p.key} onClick={() => { setPreset(p); setEditing("new"); setPicker(false); }} className="rounded-xl text-left p-4"
                  style={{ border: "1px solid var(--border)", background: "#FFFFFF", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.background = "#FAF8FF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "#FFFFFF"; }}>
                  <div className="flex items-center gap-2.5" style={{ marginBottom: 6 }}>
                    <span className="flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, background: "#F5F3FF" }}><Zap size={14} color="#7C3AED" /></span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>{p.name}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>{p.description}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8" }}>
                    <span style={{ color: "#7C3AED", fontWeight: 600 }}>{prettyTrigger(p.triggerType)}</span>
                    {" → "}{p.steps.map((s) => shortStep(s.type)).join(" → ")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
const fieldStyle: React.CSSProperties = { width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, color: "#0F172A", background: "#fff" };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 5 };

function nodeSummary(type: StepType, config: Record<string, unknown>): string {
  if (type === "email") return config.templateName ? `Template: ${config.templateName}` : config.subject ? String(config.subject) : "Choose a template";
  if (type === "wait") return `${config.amount ?? 1} ${config.unit ?? "days"}`;
  if (type === "branch") return CONDITIONS.find((c) => c.value === config.condition)?.label ?? "Condition";
  return config.tag ? String(config.tag) : "Choose a tag";
}

function TriggerNode({ data, selected }: NodeProps) {
  const d = data as { triggerType: string; delayMin: number; runState?: RunStepStatus };
  const run = d.runState;
  return (
    <div className={run === "running" ? "nx-run-pulse" : undefined} style={{ position: "relative", width: 230, display: "flex", gap: 10, alignItems: "center", background: "#FFFFFF", border: `2px solid ${run ? RUN_RING[run] : selected ? "#7C3AED" : "var(--border)"}`, borderRadius: 12, padding: "10px 12px", boxShadow: run ? `0 0 0 4px ${RUN_RING[run]}22` : selected ? "0 0 0 4px #F5F3FF" : "0 1px 4px rgba(15,23,42,0.08)", opacity: run === "skipped" ? 0.55 : 1, fontFamily: font }}>
      {run && <RunBadge state={run} />}
      <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 32, height: 32, background: "#F5F3FF" }}><Zap size={15} color="#7C3AED" /></span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "inline-block", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color: "#7C3AED", background: "#F5F3FF", padding: "1px 6px", borderRadius: 4, marginBottom: 3 }}>TRIGGER</span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{prettyTrigger(d.triggerType)}</span>
        <span style={{ display: "block", fontSize: 11, color: "#64748B" }}>{d.delayMin > 0 ? `Wait ${d.delayMin} min` : "Starts the flow"}</span>
      </span>
      <Handle type="source" position={Position.Bottom} style={{ width: 9, height: 9, background: "#7C3AED" }} />
    </div>
  );
}

function StepNode({ data, selected }: NodeProps) {
  const d = data as { stepType: StepType; config: Record<string, unknown>; runState?: RunStepStatus };
  const m = stepMeta(d.stepType);
  const run = d.runState;
  return (
    <div className={run === "running" ? "nx-run-pulse" : undefined} style={{ position: "relative", width: 230, display: "flex", gap: 10, alignItems: "center", background: "#FFFFFF", border: `2px solid ${run ? RUN_RING[run] : selected ? m.color : "var(--border)"}`, borderRadius: 12, padding: "10px 12px", boxShadow: run ? `0 0 0 4px ${RUN_RING[run]}22` : selected ? `0 0 0 4px ${m.bg}` : "0 1px 4px rgba(15,23,42,0.08)", opacity: run === "skipped" ? 0.6 : 1, fontFamily: font }}>
      {run && <RunBadge state={run} />}
      <Handle type="target" position={Position.Top} style={{ width: 9, height: 9, background: m.color }} />
      <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 32, height: 32, background: m.bg }}><m.icon size={15} color={m.color} /></span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "inline-block", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color: m.color, background: m.bg, padding: "1px 6px", borderRadius: 4, marginBottom: 3 }}>{stepKicker(d.stepType)}</span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{m.label}</span>
        <span className="truncate" style={{ display: "block", fontSize: 11, color: "#64748B", maxWidth: 150 }}>{nodeSummary(d.stepType, d.config)}</span>
      </span>
      <Handle type="source" position={Position.Bottom} style={{ width: 9, height: 9, background: m.color }} />
    </div>
  );
}

const nodeTypes = { trigger: TriggerNode, step: StepNode };

// Connection with a visible delete (×) button on the line (n8n-style).
function DeletableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style }: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <button onClick={(e) => { e.stopPropagation(); setEdges((es) => es.filter((ed) => ed.id !== id)); }} title="Delete connection" className="nodrag nopan"
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
          style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all", width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", border: "1px solid var(--border)", color: "#94A3B8", opacity: 0.6, transition: "opacity .15s", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Trash2 size={12} />
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
const edgeTypes = { deletable: DeletableEdge };

function FlowCanvas({ id, preset, onBack }: { id: number | null; preset?: AutomationPreset | null; onBack: () => void }) {
  const [name, setName] = useState(preset ? preset.name : "Untitled automation");
  const [status, setStatus] = useState<string>("draft");
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const [loading, setLoading] = useState(id != null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const idRef = useRef(preset ? preset.steps.length : 1);

  // Test-run (n8n-style moving light). Simulated today; swaps to the real
  // crm-api test-run + SSE when RUN_MODE flips to "real".
  const [running, setRunning] = useState(false);
  const [runLog, setRunLog] = useState<RunEvent[]>([]);
  const [testEmail, setTestEmail] = useState(TEST_EMAIL_DEFAULT);
  const [panelOpen, setPanelOpen] = useState(false);
  const runRef = useRef<RunHandle | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(preset ? presetToNodes(preset) : [
    { id: "trigger", type: "trigger", position: { x: 250, y: 24 }, deletable: false, data: { triggerType: "contact_added", delayMin: 0 } },
    { id: "s1", type: "step", position: { x: 250, y: 190 }, data: { stepType: "email", config: defaultConfig("email") } },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(preset ? presetToEdges(preset) : [{ id: "e-trigger-s1", source: "trigger", target: "s1", type: "deletable" }]);

  useEffect(() => { listTemplates().then(setTemplates); }, []);

  // Load an existing automation's graph (trigger + chained steps) into the canvas.
  useEffect(() => {
    if (id == null) return;
    getAutomation(id).then((d) => {
      if (d) {
        setName(d.automation.name);
        setStatus(d.automation.status);
        const delayMin = Number((d.triggerConfig as { delayMinutes?: number }).delayMinutes ?? 0);
        const tNode: Node = { id: "trigger", type: "trigger", position: { x: 250, y: 24 }, deletable: false, data: { triggerType: d.automation.triggerType, delayMin } };
        const stepNodes: Node[] = d.steps.map((rs, i) => { idRef.current += 1; return { id: `s${idRef.current}`, type: "step", position: { x: 250, y: 190 + i * 150 }, data: { stepType: typeByKind(rs.kind), config: parseConfig(rs.configJson) } }; });
        const chain: Edge[] = []; let prev = "trigger";
        stepNodes.forEach((n) => { chain.push({ id: `e-${prev}-${n.id}`, source: prev, target: n.id, type: "deletable" }); prev = n.id; });
        setNodes([tNode, ...stepNodes]); setEdges(chain);
      }
      setLoading(false);
    });
  }, [id, setNodes, setEdges]);

  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge({ ...c, type: "deletable" }, es)), [setEdges]);

  const addNode = (type: StepType) => {
    idRef.current += 1; const nid = `s${idRef.current}`;
    const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0);
    const node: Node = { id: nid, type: "step", position: { x: 250, y: maxY + 150 }, data: { stepType: type, config: defaultConfig(type) } };
    // Connect after the selected step, else after the current end-of-chain leaf.
    const childOf = (s: string) => edges.find((e) => e.source === s)?.target;
    let leaf = "trigger", next = childOf("trigger"); const seen = new Set<string>();
    while (next && !seen.has(next)) { seen.add(next); leaf = next; next = childOf(leaf); }
    const from = selectedId && selectedId !== "trigger" && nodes.some((n) => n.id === selectedId) ? selectedId : leaf;
    setNodes((ns) => [...ns, node]);
    setEdges((es) => addEdge({ id: `e-${from}-${nid}`, source: from, target: nid, type: "deletable" }, es));
    setSelectedId(nid);
  };
  const updateData = (nodeId: string, patch: Record<string, unknown>) =>
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
  const updateConfig = (nodeId: string, cfg: Record<string, unknown>) =>
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, config: { ...((n.data.config as Record<string, unknown>) ?? {}), ...cfg } } } : n)));
  const removeNode = (nodeId: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedId("trigger");
  };

  // Linearise the graph (trigger first, then each connected step) for a run.
  const orderedForRun = (): Node[] => {
    const childOf = (s: string) => edges.find((e) => e.source === s)?.target;
    const out: Node[] = []; const trig = nodes.find((n) => n.id === "trigger"); if (trig) out.push(trig);
    const seen = new Set<string>(); let cur = childOf("trigger");
    while (cur && !seen.has(cur)) { seen.add(cur); const n = nodes.find((x) => x.id === cur); if (n) out.push(n); cur = childOf(cur); }
    return out;
  };

  const buildPlan = (email: string): RunPlanStep[] => orderedForRun().map((n) => {
    if (n.id === "trigger") {
      const tt = String(n.data.triggerType ?? "contact_added");
      return { id: n.id, title: prettyTrigger(tt), resolve: () => ({ status: "completed", detail: `Enrolled a test contact · ${email}` }) };
    }
    const type = n.data.stepType as StepType;
    const cfg = (n.data.config as Record<string, unknown>) ?? {};
    const base = { id: n.id, title: stepMeta(type).label };

    if (type === "email") {
      return {
        ...base,
        resolve: async () => {
          // Email steps REALLY send to the test inbox.
          if (cfg.templateId == null || cfg.templateId === "") return { status: "failed", detail: "No template selected — choose one before this can run" };
          const tid = Number(cfg.templateId);
          const tpl = templates.find((t) => t.id === tid);
          const tname = cfg.templateName ? String(cfg.templateName) : (tpl?.name ?? `template #${tid}`);
          // Subject must be non-blank (API rejects blank): node override → template default → name.
          const subject = String(cfg.subject ?? "").trim() || (tpl?.subjectDefault ?? "").trim() || tname;
          const res = await sendTemplateToTest(tid, subject, email);
          return res.ok ? { status: "completed", detail: `Sent “${tname}” → ${email}` } : { status: "failed", detail: `Send failed: ${res.error}` };
        },
      };
    }
    if (type === "wait") {
      // Honor the real delay in test (capped at MAX_TEST_WAIT_MS so a "days" delay doesn't hang).
      const amount = Number(cfg.amount ?? 1);
      const unit = String(cfg.unit ?? "days");
      const realMs = amount * (UNIT_MS[unit] ?? UNIT_MS.days);
      const capped = realMs > MAX_TEST_WAIT_MS;
      return {
        ...base,
        waitMs: capped ? 1500 : realMs,
        resolve: () => capped
          ? { status: "skipped", detail: `Waited ${amount} ${unit} — compressed for testing` }
          : { status: "completed", detail: `Waited ${amount} ${unit}` },
      };
    }
    if (type === "branch") {
      return { ...base, resolve: () => { const lbl = CONDITIONS.find((c) => c.value === cfg.condition)?.label ?? "Condition"; return { status: "completed", detail: `${lbl} → following the connected path` }; } };
    }
    return { ...base, resolve: () => (cfg.tag ? { status: "completed", detail: `Would tag “${cfg.tag}” (simulated)` } : { status: "skipped", detail: "No tag set" }) };
  });

  const applyRunEvent = (e: RunEvent) => {
    // Light the active node; animate the edge feeding into it.
    setNodes((ns) => ns.map((n) => (n.id === e.stepId ? { ...n, data: { ...n.data, runState: e.status } } : n)));
    if (e.status === "running") setEdges((es) => es.map((ed) => (ed.target === e.stepId ? { ...ed, animated: true, style: { stroke: "#F59E0B", strokeWidth: 2.5 } } : { ...ed, animated: false, style: undefined })));
    if (e.status !== "running") setRunLog((l) => [...l, e]); // log the resolved line only
  };

  const clearRunVisuals = () => {
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, runState: undefined } })));
    setEdges((es) => es.map((ed) => ({ ...ed, animated: false, style: undefined })));
  };

  const startRun = () => {
    if (running) return;
    setPanelOpen(true); setRunLog([]); clearRunVisuals();
    const email = testEmail.trim() || TEST_EMAIL_DEFAULT;
    const plan = buildPlan(email);
    if (plan.length <= 1) { setRunLog([{ stepId: "trigger", title: "Execute workflow", status: "failed", detail: "Add at least one step before running.", ts: Date.now() }]); return; }
    setRunning(true);
    runRef.current = runFlow(plan, applyRunEvent, () => { setRunning(false); setEdges((es) => es.map((ed) => ({ ...ed, animated: false, style: undefined }))); });
  };

  const stopRun = () => { runRef.current?.cancel(); setRunning(false); setEdges((es) => es.map((ed) => ({ ...ed, animated: false, style: undefined }))); };
  useEffect(() => () => runRef.current?.cancel(), []);

  const save = async () => {
    setBusy(true); setSavedNote("");
    const tNode = nodes.find((n) => n.id === "trigger");
    const triggerType = String(tNode?.data.triggerType ?? "contact_added");
    const delayMin = Number(tNode?.data.delayMin ?? 0);
    const triggerConfig = delayMin > 0 ? { delayMinutes: delayMin } : {};
    // Linearise the graph by following edges from the trigger.
    const childOf = (src: string) => edges.find((e) => e.source === src)?.target;
    const ordered: Node[] = []; const seen = new Set<string>(); let cur = childOf("trigger");
    while (cur && !seen.has(cur)) { seen.add(cur); const n = nodes.find((x) => x.id === cur); if (n && n.type === "step") ordered.push(n); cur = childOf(cur); }
    let aid = currentId;
    if (aid == null) {
      const res = await createAutomation({ name: name.trim() || "Untitled automation", triggerType, triggerConfig });
      if (!res.ok || res.id == null) { setBusy(false); setSavedNote("Save failed"); return; }
      aid = res.id; setCurrentId(aid);
    }
    const dto: StepInput[] = ordered.map((n) => ({ kind: KIND_BY_TYPE[n.data.stepType as StepType], branch: "main", parentStepId: null, config: (n.data.config as Record<string, unknown>) ?? {} }));
    const ok = await updateAutomation(aid, { name: name.trim() || "Untitled automation", triggerConfig, steps: dto });
    setBusy(false); setSavedNote(ok ? "Saved" : "Save failed");
  };

  const selectedNode = nodes.find((n) => n.id === selectedId) || null;
  const stepCount = nodes.filter((n) => n.type === "step").length;

  return (
    <div className="flex h-full relative" style={{ fontFamily: font, minHeight: 560 }}>
      <style>{`
        @keyframes nx-pulse { 0%,100%{ box-shadow:0 0 0 0 rgba(245,158,11,0.45);} 50%{ box-shadow:0 0 0 7px rgba(245,158,11,0);} }
        .nx-run-pulse { animation: nx-pulse 1s ease-in-out infinite; }
        @keyframes nx-spin { to { transform: rotate(360deg); } }
        .nx-spin { animation: nx-spin 0.8s linear infinite; }
      `}</style>
      <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 shrink-0" style={{ height: 48, background: "#FFFFFF", borderBottom: "1px solid var(--border)" }}>
          <button onClick={onBack} style={{ fontSize: 12, color: "#2563EB", cursor: "pointer" }}>← Automations</button>
          <span style={{ color: "#CBD5E1" }}>|</span>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", border: "none", outline: "none", background: "transparent", minWidth: 200 }} />
          {(() => { const sc = statusConfig[status] ?? statusConfig.draft; return (
            <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, background: sc.bg, color: sc.color, fontWeight: 600 }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
          ); })()}
          <div className="flex-1" />
          {savedNote && <span style={{ fontSize: 11, color: savedNote === "Saved" ? "#16A34A" : "#DC2626" }}>{savedNote}</span>}
          <span style={{ fontSize: 11, color: "#94A3B8" }}>{stepCount} step{stepCount === 1 ? "" : "s"}</span>
          <button onClick={running ? stopRun : startRun} disabled={loading} title="Run the flow once against the test inbox (emails really send)" className="flex items-center gap-1.5"
            style={{ fontSize: 12, color: running ? "#DC2626" : "#7C3AED", background: running ? "#FEF2F2" : "#F5F3FF", padding: "5px 12px", border: "none", borderRadius: 6, cursor: loading ? "default" : "pointer" }}>
            {running ? <><X size={13} /> Stop</> : <><Play size={13} /> Execute workflow</>}
          </button>
          <button onClick={save} disabled={busy || loading} style={{ fontSize: 12, color: "#FFFFFF", background: "#2563EB", padding: "5px 14px", border: "none", borderRadius: 6, cursor: busy || loading ? "default" : "pointer", opacity: busy || loading ? 0.6 : 1 }}>{busy ? "Saving…" : "Save"}</button>
        </div>

        {/* React Flow canvas — drag nodes, drag from a node's bottom dot to connect */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)} onPaneClick={() => setSelectedId(null)}
            defaultEdgeOptions={{ type: "deletable" }} fitView proOptions={{ hideAttribution: true }} style={{ background: "#F8FAFC" }}>
            <Background gap={16} color="#E2E8F0" />
            <Controls showInteractive={false} />
            <MiniMap pannable nodeColor={(n) => (n.type === "trigger" ? "#7C3AED" : "#2563EB")} />
            <Panel position="top-left">
              <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2"
                style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: "#2563EB", border: "none", cursor: "pointer", boxShadow: "0 2px 10px rgba(37,99,235,0.30)" }}>
                <Plus size={14} /> Add node
              </button>
            </Panel>
          </ReactFlow>

          {/* Add-node drawer (n8n-style) */}
          {addOpen && (
            <>
              <div onClick={() => setAddOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.18)", zIndex: 20 }} />
              <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 300, background: "#FFFFFF", borderLeft: "1px solid var(--border)", boxShadow: "-8px 0 30px rgba(15,23,42,0.12)", zIndex: 21, padding: 16, overflowY: "auto" }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Add a step</p>
                  <button onClick={() => setAddOpen(false)} title="Close" style={{ color: "#94A3B8", cursor: "pointer", background: "transparent", border: "none" }}><X size={16} /></button>
                </div>
                <div className="space-y-2">
                  {STEP_CATALOG.map((n) => (
                    <button key={n.type} onClick={() => { addNode(n.type); setAddOpen(false); }} className="flex items-center gap-3 w-full rounded-xl text-left"
                      style={{ padding: "10px 12px", border: "1px solid var(--border)", background: "#FFFFFF", cursor: "pointer" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = n.color; e.currentTarget.style.background = n.bg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "#FFFFFF"; }}>
                      <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 34, height: 34, background: n.bg }}><n.icon size={16} color={n.color} /></span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{n.label}</span>
                        <span style={{ display: "block", fontSize: 11.5, color: "#94A3B8" }}>{n.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Test-run log panel (n8n execution log) */}
        {panelOpen && (
          <div style={{ height: 196, background: "#FFFFFF", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div className="flex items-center gap-2" style={{ padding: "8px 12px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
              <FlaskConical size={13} color="#7C3AED" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>Execute workflow</span>
              <span title="Emails really send to the test address. Delays are compressed and branch/tag steps are simulated — the live execution engine ships with crm-api. No live audience is enrolled." style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", color: "#7C3AED", background: "#F5F3FF", padding: "2px 6px", borderRadius: 999 }}>TEST MODE</span>
              <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test email" style={{ fontSize: 11, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, width: 210, color: "#0F172A" }} />
              <button onClick={running ? stopRun : startRun} className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 500, color: "#FFFFFF", background: running ? "#DC2626" : "#7C3AED", padding: "4px 12px", border: "none", borderRadius: 6, cursor: "pointer" }}>
                {running ? <><X size={12} /> Stop</> : <><Play size={12} /> Run</>}
              </button>
              <div className="flex-1" />
              <button onClick={() => setPanelOpen(false)} title="Close" style={{ color: "#94A3B8", cursor: "pointer", background: "transparent", border: "none" }}><X size={15} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px" }}>
              {runLog.length === 0 ? (
                <p style={{ fontSize: 11, color: "#94A3B8", padding: "8px 0" }}>Press <b>Run</b> to execute the flow once. Email steps really send to the test address above; delays/branches are simulated until the live engine lands.</p>
              ) : (
                runLog.map((e, i) => {
                  const c = RUN_RING[e.status];
                  return (
                    <div key={i} className="flex items-start gap-2" style={{ padding: "5px 0", borderBottom: i < runLog.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                      <span style={{ marginTop: 1, width: 15, height: 15, borderRadius: 999, background: c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {e.status === "completed" ? <Check size={9} /> : e.status === "failed" ? <X size={9} /> : e.status === "skipped" ? <Clock size={8} /> : <Loader2 size={9} className="nx-spin" />}
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0F172A" }}>{e.title}</span>
                        <span style={{ fontSize: 11, color: e.status === "failed" ? "#DC2626" : "#64748B", marginLeft: 6 }}>{e.detail}</span>
                      </span>
                      <span style={{ fontSize: 10, color: "#CBD5E1", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{new Date(e.ts).toLocaleTimeString([], { hour12: false })}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Node settings — opens on node click (n8n NDV) */}
      {selectedNode && (
        <div onClick={() => setSelectedId(null)} style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} className="overflow-y-auto" style={{ width: 460, maxWidth: "100%", maxHeight: "86%", padding: 20, background: "#FFFFFF", borderRadius: 14, boxShadow: "0 24px 60px rgba(15,23,42,0.30)", fontFamily: font }}>
            <div className="flex justify-end" style={{ marginBottom: 6 }}>
              <button onClick={() => setSelectedId(null)} title="Close" style={{ color: "#94A3B8", cursor: "pointer", background: "transparent", border: "none" }}><X size={16} /></button>
            </div>
            {selectedNode?.id === "trigger" ? (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.05em", marginBottom: 14 }}>TRIGGER</p>
            <div className="space-y-4">
              <div>
                <label style={labelStyle}>When this happens</label>
                <select value={String(selectedNode.data.triggerType)} onChange={(e) => updateData("trigger", { triggerType: e.target.value })} style={fieldStyle}>
                  {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Wait before starting</label>
                <div className="flex gap-2 items-center">
                  <input type="number" min={0} value={Number(selectedNode.data.delayMin ?? 0)} onChange={(e) => updateData("trigger", { delayMin: Math.max(0, Number(e.target.value)) })} style={{ ...fieldStyle, width: 90 }} />
                  <span style={{ fontSize: 12, color: "#64748B" }}>minutes</span>
                </div>
              </div>
            </div>
          </>
        ) : selectedNode ? (() => {
          const stepType = selectedNode.data.stepType as StepType;
          const config = (selectedNode.data.config as Record<string, unknown>) ?? {};
          return (
            <>
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.05em" }}>{stepKicker(stepType)} · {stepMeta(stepType).label.toUpperCase()}</p>
                <button onClick={() => removeNode(selectedNode.id)} title="Remove step" style={{ color: "#DC2626", cursor: "pointer", background: "transparent", border: "none" }}><Trash2 size={14} /></button>
              </div>
              {stepType === "email" && (
                <div className="space-y-4">
                  <div>
                    <label style={labelStyle}>Email template</label>
                    <select value={String(config.templateId ?? "")} onChange={(e) => { const tid = e.target.value ? Number(e.target.value) : null; updateConfig(selectedNode.id, { templateId: tid, templateName: templates.find((t) => t.id === tid)?.name ?? null }); }} style={fieldStyle}>
                      <option value="">Choose a template…</option>
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Subject override (optional)</label>
                    <input value={String(config.subject ?? "")} onChange={(e) => updateConfig(selectedNode.id, { subject: e.target.value })} placeholder="Leave blank to use the template's" style={fieldStyle} />
                  </div>
                </div>
              )}
              {stepType === "wait" && (
                <div>
                  <label style={labelStyle}>Wait duration</label>
                  <div className="flex gap-2">
                    <input type="number" min={1} value={Number(config.amount ?? 1)} onChange={(e) => updateConfig(selectedNode.id, { amount: Math.max(1, Number(e.target.value)) })} style={{ ...fieldStyle, flex: 1 }} />
                    <select value={String(config.unit ?? "days")} onChange={(e) => updateConfig(selectedNode.id, { unit: e.target.value })} style={{ ...fieldStyle, width: 110 }}>
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                  <span style={{ fontSize: 10, color: "#94A3B8", marginTop: 6, display: "block" }}>Tip: set <b>seconds</b> to watch a test run in real time (delays over 60s are compressed in test).</span>
                </div>
              )}
              {stepType === "branch" && (
                <div>
                  <label style={labelStyle}>Continue only if</label>
                  <select value={String(config.condition ?? "opened_previous")} onChange={(e) => updateConfig(selectedNode.id, { condition: e.target.value })} style={fieldStyle}>
                    {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              )}
              {stepType === "tag" && (
                <div>
                  <label style={labelStyle}>Tag to apply</label>
                  <input value={String(config.tag ?? "")} onChange={(e) => updateConfig(selectedNode.id, { tag: e.target.value })} placeholder="e.g. engaged" style={fieldStyle} />
                </div>
              )}
            </>
          );
            })() : null}
          </div>
        </div>
      )}
    </div>
  );
}