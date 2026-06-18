"use client";

import {
  Send, Clock, Edit3, Plus, ChevronRight, ChevronLeft, X, Eye, Users,
  ArrowUpRight, MousePointerClick, TrendingDown, DollarSign, Trash2, LayoutTemplate, Pause, Loader2,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  listCampaigns, getCampaign, getAnalytics, createCampaign, updateCampaign, deleteCampaign,
  testCampaign, sendCampaign, listAudiences, rates, type Campaign, type CampaignInput, type AudienceOption,
} from "@/lib/campaigns";
import { listTemplates, type Template } from "@/lib/templates";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
const money = (n: number) => "$" + Math.round(n || 0).toLocaleString();
const num = (n: number) => (n || 0).toLocaleString();
const pct1 = (n: number) => (n || 0).toFixed(1) + "%";
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

const statusConfig: Record<string, { bg: string; color: string; icon: typeof Send; label: string }> = {
  draft: { bg: "#F8FAFC", color: "#64748B", icon: Edit3, label: "Draft" },
  scheduled: { bg: "#FFFBEB", color: "#D97706", icon: Clock, label: "Scheduled" },
  sending: { bg: "#EFF6FF", color: "#2563EB", icon: Send, label: "Sending" },
  sent: { bg: "#F0FDF4", color: "#16A34A", icon: Send, label: "Sent" },
  paused: { bg: "#F1F5F9", color: "#64748B", icon: Pause, label: "Paused" },
};
const sc = (s: string) => statusConfig[s] || statusConfig.draft;

const TABS: { id: string; label: string }[] = [
  { id: "all", label: "All" }, { id: "sent", label: "Sent" }, { id: "scheduled", label: "Scheduled" }, { id: "draft", label: "Draft" },
];

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [view, setView] = useState<"list" | "compose" | "detail">("list");
  const [editId, setEditId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const reload = useCallback(async () => { setLoading(true); setCampaigns(await listCampaigns()); setLoading(false); }, []);
  useEffect(() => { reload(); }, [reload]);

  if (view === "compose") {
    return <Composer campaignId={editId} onCancel={() => { setView("list"); setEditId(null); }} onDone={() => { setView("list"); setEditId(null); reload(); }} />;
  }
  if (view === "detail" && detailId != null) {
    return <Detail id={detailId} onBack={() => { setView("list"); reload(); }} onEdit={(id) => { setEditId(id); setView("compose"); }} />;
  }

  const visible = campaigns.filter((c) => c.status !== "cancelled"); // soft-deleted campaigns stay out of the list
  const filtered = activeTab === "all" ? visible : visible.filter((c) => c.status === activeTab);
  const countFor = (id: string) => (id === "all" ? visible.length : visible.filter((c) => c.status === id).length);

  return (
    <div className="p-6 space-y-4" style={{ fontFamily: font }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#0F172A" }}>Campaigns</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>One-time email broadcasts to your lists and segments.</p>
        </div>
        <button onClick={() => { setEditId(null); setView("compose"); }} className="flex items-center gap-1.5 rounded-lg px-3 py-2"
          style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
          <Plus size={14} /> New Campaign
        </button>
      </div>

      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#F1F5F9", width: "fit-content" }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 6, background: activeTab === tab.id ? "#FFFFFF" : "transparent", color: activeTab === tab.id ? "#0F172A" : "#64748B", border: activeTab === tab.id ? "1px solid var(--border)" : "none", cursor: "pointer", fontFamily: font }}>
            {tab.label} <span style={{ color: "#94A3B8" }}>{countFor(tab.id)}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
        {loading ? (
          <p style={{ fontSize: 13, color: "#94A3B8", padding: 24 }}>Loading campaigns…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Send} title={activeTab === "all" ? "No campaigns yet" : `No ${activeTab} campaigns`}
            description={activeTab === "all" ? "Create your first broadcast — pick an audience and a template, then send." : "Nothing here yet."}
            action={activeTab === "all" ? <button onClick={() => { setEditId(null); setView("compose"); }} className="rounded-lg px-4 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>New Campaign</button> : undefined} />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Campaign", "Status", "Recipients", "Opens", "Clicks", "Unsubs", "Revenue", "Sent / Scheduled"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.04em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const s = sc(c.status); const SIcon = s.icon; const r = rates(c); const isSent = c.status === "sent";
                return (
                  <tr key={c.id} onClick={() => { setDetailId(c.id); setView("detail"); }} style={{ borderBottom: "1px solid #F8FAFC", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "10px 14px" }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{c.name}</p>
                      <p className="truncate" style={{ fontSize: 11, color: "#64748B", maxWidth: 280 }}>{c.subject || "No subject"}</p>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: s.bg, color: s.color }}>{c.status === "sending" ? <Loader2 size={10} className="animate-spin" /> : <SIcon size={10} />}{s.label}</span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{c.recipientCount ? num(c.recipientCount) : "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>{isSent ? pct1(r.openRate) : "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>{isSent ? pct1(r.clickRate) : "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>{isSent ? pct1(r.unsubRate) : "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{isSent ? money(c.revenue) : "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "#64748B" }}>{c.sentAt ? `Sent ${fmtDate(c.sentAt)}` : c.scheduledFor ? `For ${fmtDate(c.scheduledFor)}` : "Draft"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Composer ───────────────────────────
const STEPS = ["Settings", "Audience", "Content", "Review & Send"];

function Composer({ campaignId, onCancel, onDone }: { campaignId: number | null; onCancel: () => void; onDone: () => void }) {
  const [id, setId] = useState<number | null>(campaignId);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<CampaignInput>({ name: "", subject: "", preheader: "", fromName: "", fromEmail: "no-reply@crm.netx.cc", targetListId: null, targetSegmentId: null, excludeSegmentId: null, templateId: null });
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [confirmSend, setConfirmSend] = useState(false);
  const [pendingSendId, setPendingSendId] = useState<number | null>(null);
  const [sendErr, setSendErr] = useState("");
  const set = (patch: Partial<CampaignInput>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => { listAudiences().then(setAudiences); listTemplates().then(setTemplates); }, []);
  useEffect(() => {
    if (campaignId == null) return;
    getCampaign(campaignId).then((c) => { if (c) setForm({ name: c.name, subject: c.subject ?? "", preheader: c.preheader ?? "", fromName: c.fromName ?? "", fromEmail: c.fromEmail || "no-reply@crm.netx.cc", replyTo: c.replyTo ?? "", targetListId: c.targetListId, targetSegmentId: c.targetSegmentId, excludeSegmentId: c.excludeSegmentId, templateId: c.templateId }); });
  }, [campaignId]);

  // Ensure a draft exists, then persist the current form.
  const save = async (): Promise<number | null> => {
    if (!form.name?.trim()) { alert("Campaign name is required."); setStep(1); return null; }
    setBusy(true);
    let cid = id;
    if (cid == null) {
      const res = await createCampaign(form);
      if (!res.ok || !res.id) { setBusy(false); alert(res.error || "Could not create campaign."); return null; }
      cid = res.id; setId(cid);
    } else {
      await updateCampaign(cid, form);
    }
    setBusy(false);
    return cid;
  };

  const next = async () => { if (await save()) setStep((s) => Math.min(4, s + 1)); };
  const saveDraftExit = async () => { if (await save()) onDone(); };
  const requestSend = async () => { const cid = await save(); if (cid == null) return; setPendingSendId(cid); setSendErr(""); setConfirmSend(true); };
  const confirmedSend = async () => {
    if (pendingSendId == null) return;
    setBusy(true);
    const ok = await sendCampaign(pendingSendId, null);
    setBusy(false);
    if (ok) { setConfirmSend(false); onDone(); } else setSendErr("Send failed. Please try again.");
  };

  const selectedTpl = templates.find((t) => t.id === form.templateId) || null;
  const selectedAud = audiences.find((a) => (a.kind === "list" ? a.id === form.targetListId : a.id === form.targetSegmentId) && (a.kind === "list" ? form.targetListId != null : form.targetSegmentId != null)) || null;
  const inputStyle = { width: "100%", fontSize: 13, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, outline: "none", color: "#0F172A", fontFamily: font, boxSizing: "border-box" as const };

  return (
    <div className="p-6" style={{ fontFamily: font }}>
      <ConfirmDialog
        open={confirmSend}
        title="Send this campaign now?"
        message={`“${form.name || "This campaign"}” will be sent to its target audience. This can’t be undone.`}
        confirmLabel="Send now"
        busy={busy}
        onConfirm={confirmedSend}
        onCancel={() => setConfirmSend(false)}
      />
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onCancel} className="flex items-center gap-1" style={{ fontSize: 12, color: "#2563EB", cursor: "pointer" }}><ChevronLeft size={13} /> Campaigns</button>
        <ChevronRight size={12} color="#94A3B8" />
        <span style={{ fontSize: 12, color: "#64748B" }}>{campaignId ? "Edit Campaign" : "New Campaign"}</span>
      </div>
      {sendErr && <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #FECACA", marginBottom: 12 }}>{sendErr}</div>}

      <div className="flex items-center mb-8 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", width: "fit-content" }}>
        {STEPS.map((s, idx) => {
          const n = idx + 1; const done = n < step; const cur = n === step;
          return (
            <button key={s} onClick={() => setStep(n)} className="flex items-center gap-2 px-5 py-3"
              style={{ fontSize: 12, fontWeight: cur ? 600 : 400, background: cur ? "#0F172A" : done ? "#EFF6FF" : "#FFFFFF", color: cur ? "#FFFFFF" : done ? "#2563EB" : "#64748B", borderRight: idx < STEPS.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", fontFamily: font }}>
              <span className="flex items-center justify-center rounded-full" style={{ width: 18, height: 18, fontSize: 10, fontWeight: 600, background: cur ? "#FFFFFF" : done ? "#2563EB" : "#E2E8F0", color: cur ? "#0F172A" : done ? "#FFFFFF" : "#64748B" }}>{done ? "✓" : n}</span>
              {s}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)", maxWidth: 640 }}>
        {step === 1 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Campaign Settings</h2>
            <Field label="Campaign Name (internal)" hint="Not shown to recipients">
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. June Newsletter 2026" style={inputStyle} />
            </Field>
            <Field label="Subject Line">
              <input value={form.subject ?? ""} onChange={(e) => set({ subject: e.target.value })} placeholder="e.g. Your June deals are here 🎉" style={inputStyle} />
            </Field>
            <Field label="Preview Text" hint="Shows after the subject in the inbox">
              <input value={form.preheader ?? ""} onChange={(e) => set({ preheader: e.target.value })} placeholder="e.g. Open to see what's new…" style={inputStyle} />
            </Field>
            <div className="grid gap-3 grid-cols-2">
              <Field label="From Name"><input value={form.fromName ?? ""} onChange={(e) => set({ fromName: e.target.value })} placeholder="Acme Corp" style={inputStyle} /></Field>
              <Field label="From Email"><input value={form.fromEmail ?? ""} onChange={(e) => set({ fromEmail: e.target.value })} placeholder="hello@acme.io" style={inputStyle} /></Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Select Audience</h2>
            {audiences.length === 0 ? (
              <p style={{ fontSize: 12, color: "#94A3B8" }}>No lists or segments yet — create one first.</p>
            ) : (
              <div className="space-y-2">
                {audiences.map((a) => {
                  const checked = a.kind === "list" ? form.targetListId === a.id : form.targetSegmentId === a.id;
                  return (
                    <label key={`${a.kind}-${a.id}`} className="flex items-center gap-3 rounded-lg p-3 cursor-pointer" style={{ border: `1px solid ${checked ? "#2563EB" : "var(--border)"}`, background: checked ? "#EFF6FF" : "#FFFFFF" }}>
                      <input type="radio" name="aud" checked={checked} onChange={() => set({ targetListId: a.kind === "list" ? a.id : null, targetSegmentId: a.kind === "segment" ? a.id : null })} style={{ accentColor: "#2563EB" }} />
                      <div className="flex-1"><span style={{ fontSize: 11, color: "#64748B", textTransform: "capitalize" }}>{a.kind}</span><p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{a.name}</p></div>
                      {a.count != null && <span className="rounded-full px-2 py-0.5" style={{ fontSize: 11, background: "#F1F5F9", color: "#64748B", fontFamily: "JetBrains Mono, monospace" }}>{num(a.count)}</span>}
                    </label>
                  );
                })}
              </div>
            )}
            <Field label="Exclude a segment (optional)">
              <select value={form.excludeSegmentId ?? ""} onChange={(e) => set({ excludeSegmentId: e.target.value ? Number(e.target.value) : null })} style={{ ...inputStyle, background: "#FFFFFF" }}>
                <option value="">No exclusion</option>
                {audiences.filter((a) => a.kind === "segment").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Email Content</h2>
            <p style={{ fontSize: 12, color: "#64748B" }}>Pick a template from your <a href="/content" style={{ color: "#2563EB", textDecoration: "none" }}>Content library</a>.</p>
            {templates.length === 0 ? (
              <div className="rounded-lg flex flex-col items-center justify-center text-center" style={{ height: 200, background: "#F8FAFC", border: "2px dashed #CBD5E1" }}>
                <LayoutTemplate size={22} color="#94A3B8" />
                <a href="/content" style={{ fontSize: 12, color: "#2563EB", marginTop: 8, textDecoration: "none" }}>Create a template in Content →</a>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <label key={t.id} className="flex items-center gap-3 rounded-lg p-3 cursor-pointer" style={{ border: `1px solid ${form.templateId === t.id ? "#2563EB" : "var(--border)"}`, background: form.templateId === t.id ? "#EFF6FF" : "#FFFFFF" }}>
                    <input type="radio" name="tpl" checked={form.templateId === t.id} onChange={() => set({ templateId: t.id })} style={{ accentColor: "#2563EB" }} />
                    <div className="rounded flex items-center justify-center" style={{ width: 28, height: 28, background: "#EFF6FF", flexShrink: 0 }}><LayoutTemplate size={14} color="#2563EB" /></div>
                    <div className="flex-1 min-w-0"><p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{t.name}</p><p className="truncate" style={{ fontSize: 11, color: "#64748B" }}>{t.subjectDefault}</p></div>
                    {form.templateId === t.id && <span style={{ fontSize: 10, fontWeight: 600, color: "#2563EB" }}>SELECTED</span>}
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Review & Send</h2>
            <div className="space-y-1">
              {[
                { label: "Campaign", value: form.name || "—" },
                { label: "Subject", value: form.subject || selectedTpl?.subjectDefault || "—" },
                { label: "Sender", value: form.fromName || form.fromEmail ? `${form.fromName ?? ""} <${form.fromEmail ?? ""}>` : "—" },
                { label: "Audience", value: selectedAud ? `${selectedAud.name}${selectedAud.count != null ? ` — ${num(selectedAud.count)}` : ""}` : "— none selected —" },
                { label: "Template", value: selectedTpl ? selectedTpl.name : "— none selected —" },
                { label: "Schedule", value: "Send now" },
              ].map((r) => (
                <div key={r.label} className="flex items-start justify-between py-3" style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <span style={{ fontSize: 12, color: "#64748B", width: 120, flexShrink: 0 }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", textAlign: "right" }}>{r.value}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#94A3B8" }}>Sends route to Mailtrap Sandbox on staging — safe to test.</p>
          </>
        )}
      </div>

      <div className="flex items-center justify-between mt-6" style={{ maxWidth: 640 }}>
        <button onClick={() => (step > 1 ? setStep(step - 1) : onCancel())} disabled={busy} style={{ fontSize: 12, fontWeight: 500, color: "#64748B", background: "#F1F5F9", border: "none", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontFamily: font }}>← Back</button>
        <div className="flex gap-2">
          <button onClick={saveDraftExit} disabled={busy} style={{ fontSize: 12, fontWeight: 500, color: "#2563EB", background: "#FFFFFF", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: font }}>Save draft</button>
          {step < 4
            ? <button onClick={next} disabled={busy} style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: "#2563EB", border: "none", padding: "8px 24px", borderRadius: 6, cursor: "pointer", fontFamily: font, opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "Save & Continue →"}</button>
            : <button onClick={requestSend} disabled={busy} style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: "#16A34A", border: "none", padding: "8px 24px", borderRadius: 6, cursor: "pointer", fontFamily: font, opacity: busy ? 0.6 : 1 }}>{busy ? "Sending…" : "🚀 Send Campaign"}</button>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

// ─────────────────────────── Detail ───────────────────────────
function Detail({ id, onBack, onEdit }: { id: number; onBack: () => void; onEdit: (id: number) => void }) {
  const [c, setC] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [testOpen, setTestOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmKind, setConfirmKind] = useState<null | "send" | "delete">(null);
  const [actionErr, setActionErr] = useState("");

  const load = useCallback(async () => { setLoading(true); const [cc, an] = await Promise.all([getCampaign(id), getAnalytics(id)]); setC(cc); setAnalytics(an); setLoading(false); }, [id]);
  useEffect(() => { load(); }, [load]);

  // Silent re-fetch (no loading flash) — used for polling.
  const refresh = useCallback(async () => { const [cc, an] = await Promise.all([getCampaign(id), getAnalytics(id)]); if (cc) setC(cc); setAnalytics(an); }, [id]);

  // While a campaign is "sending", poll until it flips to a terminal status
  // (sent/failed) so the UI updates without a manual refresh. Capped so a stuck
  // send doesn't poll forever.
  const pollCount = useRef(0);
  useEffect(() => {
    if (c?.status !== "sending") { pollCount.current = 0; return; }
    pollCount.current = 0;
    const t = setInterval(() => {
      pollCount.current += 1;
      if (pollCount.current > 40) { clearInterval(t); return; } // ~2.3 min safety cap
      refresh();
    }, 3500);
    return () => clearInterval(t);
  }, [c?.status, refresh]);

  if (loading) return <div className="p-6" style={{ fontFamily: font, fontSize: 13, color: "#94A3B8" }}>Loading campaign…</div>;
  if (!c) return <div className="p-6" style={{ fontFamily: font }}><EmptyState icon={Send} title="Campaign not found" description="It may have been deleted." action={<button onClick={onBack} className="rounded-lg px-4 py-2" style={{ fontSize: 12, background: "#2563EB", color: "#fff", cursor: "pointer" }}>Back</button>} /></div>;

  const s = sc(c.status); const Icon = s.icon; const r = rates(c); const isSent = c.status === "sent";
  const topLinks = (analytics?.topLinks as { url: string; clicks: number; pct: number }[]) || [];
  const stats = [
    { label: "Recipients", value: num(c.recipientCount), icon: Users, color: "#2563EB", bg: "#EFF6FF" },
    { label: "Open Rate", value: pct1(r.openRate), icon: ArrowUpRight, color: "#16A34A", bg: "#F0FDF4" },
    { label: "Click Rate", value: pct1(r.clickRate), icon: MousePointerClick, color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Unsubscribes", value: num(c.unsubscribedCount), icon: TrendingDown, color: "#DC2626", bg: "#FFF1F2" },
    { label: "Revenue", value: money(c.revenue), icon: DollarSign, color: "#D97706", bg: "#FFF7ED" },
  ];

  const onDelete = () => { setActionErr(""); setConfirmKind("delete"); };
  const onSend = () => { setActionErr(""); setConfirmKind("send"); };
  const runConfirm = async () => {
    setBusy(true); setActionErr("");
    const ok = confirmKind === "send" ? await sendCampaign(id, null) : await deleteCampaign(id);
    setBusy(false);
    if (!ok) { setActionErr(confirmKind === "send" ? "Send failed. Please try again." : "Delete failed. Please try again."); return; }
    const kind = confirmKind; setConfirmKind(null);
    if (kind === "send") load(); else onBack();
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: font }}>
      {testOpen && <SendTestDialog campaignId={id} onClose={() => setTestOpen(false)} />}
      <ConfirmDialog
        open={confirmKind !== null}
        title={confirmKind === "delete" ? "Delete campaign?" : "Send this campaign now?"}
        message={confirmKind === "delete"
          ? `“${c.name}” will be permanently removed. This can’t be undone.`
          : c.recipientCount > 0
            ? `“${c.name}” will be sent to its audience (${num(c.recipientCount)} recipient${c.recipientCount === 1 ? "" : "s"}). This can’t be undone.`
            : `“${c.name}” will be sent to its target audience. This can’t be undone.`}
        confirmLabel={confirmKind === "delete" ? "Delete" : "Send now"}
        danger={confirmKind === "delete"}
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => { setConfirmKind(null); setActionErr(""); }}
      />
      {actionErr && <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #FECACA" }}>{actionErr}</div>}

      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1" style={{ fontSize: 12, color: "#2563EB", cursor: "pointer" }}><ChevronLeft size={13} /> Campaigns</button>
        <ChevronRight size={12} color="#CBD5E1" />
        <span style={{ fontSize: 12, color: "#64748B" }} className="truncate">{c.name}</span>
      </div>

      <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: s.bg, color: s.color }}>{c.status === "sending" ? <Loader2 size={10} className="animate-spin" /> : <Icon size={10} />}{s.label}</span>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginTop: 6 }}>{c.name}</h2>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>Subject: {c.subject || "—"}</p>
            <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{c.sentAt ? `Sent ${fmtDate(c.sentAt)}` : c.scheduledFor ? `Scheduled for ${fmtDate(c.scheduledFor)}` : "Draft — not sent"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTestOpen(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, background: "#F1F5F9", color: "#374151", border: "1px solid var(--border)", cursor: "pointer", fontFamily: font }}><Send size={12} /> Send Test</button>
            {!isSent && <button onClick={() => onEdit(id)} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, background: "#FFFFFF", color: "#2563EB", border: "1px solid #BFDBFE", cursor: "pointer", fontFamily: font }}><Edit3 size={12} /> Edit</button>}
            {(c.status === "draft" || c.status === "scheduled") && <button onClick={onSend} disabled={busy} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, background: "#16A34A", color: "#FFFFFF", border: "none", cursor: "pointer", fontFamily: font }}><Send size={12} /> Send now</button>}
            <button onClick={onDelete} disabled={busy} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, background: "#FFFFFF", color: "#DC2626", border: "1px solid var(--border)", cursor: "pointer", fontFamily: font }}><Trash2 size={12} /></button>
          </div>
        </div>
      </div>

      {isSent ? (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            {stats.map((st) => { const SIcon = st.icon; return (
              <div key={st.label} className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2"><span style={{ fontSize: 11, color: "#64748B" }}>{st.label}</span><div className="rounded p-1" style={{ background: st.bg }}><SIcon size={12} color={st.color} /></div></div>
                <p style={{ fontSize: 20, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{st.value}</p>
              </div>
            ); })}
          </div>
          <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>Top Link Clicks</p>
            {topLinks.length === 0 ? <p style={{ fontSize: 12, color: "#94A3B8" }}>No click data yet (opens/clicks land via Mailtrap webhooks).</p>
              : <div className="space-y-3">{topLinks.map((l) => (
                  <div key={l.url}><div className="flex items-center justify-between mb-1"><span style={{ fontSize: 11, color: "#374151", fontFamily: "JetBrains Mono, monospace" }}>{l.url}</span><span style={{ fontSize: 11, fontWeight: 600, color: "#0F172A" }}>{l.clicks}</span></div>
                    <div className="rounded-full overflow-hidden" style={{ height: 4, background: "#F1F5F9" }}><div className="rounded-full" style={{ height: "100%", width: `${l.pct}%`, background: "#2563EB" }} /></div></div>
                ))}</div>}
          </div>
        </>
      ) : (
        <div className="rounded-xl p-8 text-center" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
          <Icon size={28} color="#CBD5E1" className="mx-auto mb-3" />
          <p style={{ fontSize: 13, fontWeight: 500, color: "#64748B" }}>{c.status === "scheduled" ? `Scheduled for ${fmtDate(c.scheduledFor)}` : "This campaign is a draft and hasn't been sent yet."}</p>
        </div>
      )}
    </div>
  );
}

function SendTestDialog({ campaignId, onClose }: { campaignId: number; onClose: () => void }) {
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const send = async () => {
    const list = emails.split(",").map((e) => e.trim()).filter((e) => e.includes("@"));
    if (list.length === 0) { alert("Enter at least one email."); return; }
    setBusy(true);
    const ok = await testCampaign(campaignId, list);
    setBusy(false);
    if (ok) setSent(true); else alert("Test send failed.");
  };
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.4)" }}>
      <div onClick={(e) => e.stopPropagation()} className="rounded-xl p-5" style={{ background: "#FFFFFF", width: 420, maxWidth: "92vw", fontFamily: font }}>
        <div className="flex items-center justify-between mb-3"><h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Send a test</h3><button onClick={onClose} style={{ color: "#94A3B8", cursor: "pointer" }}><X size={16} /></button></div>
        {sent ? (
          <div className="text-center py-4"><div className="rounded-full flex items-center justify-center mx-auto mb-3" style={{ width: 44, height: 44, background: "#F0FDF4" }}><Send size={18} color="#16A34A" /></div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>Test sent!</p>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Check Mailtrap Sandbox to view it.</p>
            <button onClick={onClose} className="mt-4 rounded-lg px-4 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>Comma-separated emails. On staging these go to Mailtrap Sandbox.</p>
            <input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="you@acme.io, qa@acme.io" autoFocus
              style={{ width: "100%", fontSize: 13, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, outline: "none", color: "#0F172A", boxSizing: "border-box" }} />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} style={{ fontSize: 12, fontWeight: 500, color: "#64748B", background: "#F1F5F9", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
              <button onClick={send} disabled={busy} style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: "#2563EB", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Sending…" : "Send test"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
