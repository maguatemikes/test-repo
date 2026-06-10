"use client";

import { FileText, Plus, Eye, Code, Trash2, X, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  createFormAction,
  updateFormAction,
  deleteFormAction,
  setFormStatusAction,
} from "@/server/actions/forms";
import { createListAction } from "@/server/actions/lists";

// ---------- types ----------
type FormType = "popup" | "embed" | "slide_in" | "full_screen" | "hosted";
type FormStatus = "draft" | "active" | "paused" | "archived";
type FieldType = "email" | "text" | "tel" | "checkbox" | "select" | "textarea";
type FormField = { id: string; type: FieldType; label: string; required: boolean; options?: string[] };
type FormDesign = { accentColor: string; submitText: string; title: string; description: string };
type FormTargeting = { urls: string; device: "all" | "desktop" | "mobile" };
type FormSuccess = { trigger: string; action: "message" | "redirect" | "close"; message?: string; redirectUrl?: string };

export type FormRow = {
  id: number; name: string; slug: string; type: FormType; status: FormStatus;
  impressions: number; submissions: number; targetListId: number | null;
  fields: FormField[]; design: FormDesign | null; targeting: FormTargeting | null; success: FormSuccess | null;
  updatedAt: string;
};
type ListRow = { id: number; name: string };

// ---------- constants ----------
const TYPE_LABEL: Record<FormType, string> = {
  popup: "Popup", embed: "Embed", slide_in: "Slide-in", full_screen: "Full-screen", hosted: "Hosted",
};
const typeColors: Record<string, { bg: string; color: string }> = {
  Popup: { bg: "#EFF6FF", color: "#1D4ED8" }, Embed: { bg: "#F0FDF4", color: "#15803D" },
  "Slide-in": { bg: "#F5F3FF", color: "#6D28D9" }, "Full-screen": { bg: "#FFF7ED", color: "#C2410C" },
  Hosted: { bg: "#F1F5F9", color: "#334155" },
};
const statusDot: Record<string, string> = { active: "#22C55E", paused: "#F97316", draft: "#94A3B8", archived: "#CBD5E1" };

const PALETTE: { label: string; type: FieldType }[] = [
  { label: "Email", type: "email" }, { label: "First name", type: "text" }, { label: "Last name", type: "text" },
  { label: "Phone", type: "tel" }, { label: "Checkbox", type: "checkbox" }, { label: "Dropdown", type: "select" },
  { label: "Text area", type: "textarea" },
];

const rid = () => Math.random().toString(36).slice(2, 9);

function defaultForm(lists: ListRow[]): FormRow {
  return {
    id: 0, name: "Untitled form", slug: "", type: "hosted", status: "draft",
    impressions: 0, submissions: 0, targetListId: lists[0]?.id ?? null,
    fields: [
      { id: rid(), type: "email", label: "Email", required: true },
      { id: rid(), type: "text", label: "First name", required: false },
    ],
    design: { accentColor: "#2563EB", submitText: "Subscribe →", title: "Join our newsletter", description: "Get weekly deals, new arrivals, and exclusive offers." },
    targeting: { urls: "", device: "all" },
    success: { trigger: "immediately", action: "message", message: "Thanks for subscribing!", redirectUrl: "" },
    updatedAt: "—",
  };
}

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

// ================= LIST VIEW =================
export function FormsView({ forms, lists }: { forms: FormRow[]; lists: ListRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormRow | null>(null);
  const [embedFor, setEmbedFor] = useState<FormRow | null>(null);

  if (editing) {
    return (
      <FormBuilder
        initial={editing}
        lists={lists}
        onBack={() => { setEditing(null); router.refresh(); }}
        onListsChanged={() => router.refresh()}
      />
    );
  }

  const active = forms.filter((f) => f.status === "active").length;
  const totalImp = forms.reduce((s, f) => s + f.impressions, 0);
  const totalSub = forms.reduce((s, f) => s + f.submissions, 0);
  const avgConv = totalImp > 0 ? ((totalSub / totalImp) * 100).toFixed(1) + "%" : "—";
  const listName = (id: number | null) => lists.find((l) => l.id === id)?.name ?? "—";

  return (
    <div className="p-4 md:p-6 space-y-4" style={{ fontFamily: font }}>
      {embedFor && <EmbedModal form={embedFor} onClose={() => setEmbedFor(null)} />}

      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, color: "#64748B" }}>
          <strong style={{ color: "#0F172A" }}>{forms.length}</strong> forms · <strong style={{ color: "#16A34A" }}>{active}</strong> active
        </p>
        <button onClick={() => setEditing(defaultForm(lists))} className="flex items-center gap-1.5 rounded-lg px-3 py-2"
          style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", border: "none", cursor: "pointer" }}>
          <Plus size={13} /> New Form
        </button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Impressions", value: totalImp.toLocaleString(), color: "#2563EB" },
          { label: "Total Submissions", value: totalSub.toLocaleString(), color: "#16A34A" },
          { label: "Avg Conversion", value: avgConv, color: "#7C3AED" },
          { label: "Active Forms", value: String(active), color: "#F59E0B" },
        ].map((k) => (
          <div key={k.label} className="rounded-lg p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 11, color: "#64748B" }}>{k.label}</span>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", fontFamily: "JetBrains Mono, monospace", marginTop: 6 }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto"><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
              {["Form Name", "Type", "Status", "Impressions", "Submissions", "Conv. Rate", "Linked List", "Updated", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", padding: "9px 14px" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forms.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 0 }}>
                <EmptyState
                  icon={FileText}
                  title="No forms yet"
                  description="Build a signup form to capture subscribers — embed it on your site or share a hosted link. Submissions flow straight into your lists."
                  action={
                    <button onClick={() => setEditing(defaultForm(lists))} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
                      <Plus size={13} /> New Form
                    </button>
                  }
                />
              </td></tr>
            )}
            {forms.map((f, i) => {
              const label = TYPE_LABEL[f.type];
              const tc = typeColors[label] ?? typeColors.Hosted;
              const conv = f.impressions > 0 ? ((f.submissions / f.impressions) * 100).toFixed(1) + "%" : "—";
              return (
                <tr key={f.id} style={{ borderBottom: i < forms.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                  <td style={{ padding: "10px 14px", cursor: "pointer" }} onClick={() => setEditing(f)}>
                    <div className="flex items-center gap-2">
                      <FileText size={13} color="#94A3B8" />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{f.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}><span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: tc.bg, color: tc.color }}>{label}</span></td>
                  <td style={{ padding: "10px 14px" }}>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full" style={{ width: 6, height: 6, background: statusDot[f.status], display: "inline-block" }} />
                      <span style={{ fontSize: 12, color: "#64748B" }}>{f.status.charAt(0).toUpperCase() + f.status.slice(1)}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0F172A" }}>{f.impressions > 0 ? f.impressions.toLocaleString() : "—"}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0F172A" }}>{f.submissions > 0 ? f.submissions.toLocaleString() : "—"}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: conv !== "—" ? "#7C3AED" : "#CBD5E1" }}>{conv}</td>
                  <td style={{ padding: "10px 14px" }}><span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, background: "#EFF6FF", color: "#1D4ED8" }}>{listName(f.targetListId)}</span></td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: "#64748B" }}>{f.updatedAt}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div className="flex items-center gap-2">
                      <a href={`/f/${f.slug}`} target="_blank" rel="noreferrer" style={{ color: "#94A3B8" }} title="Preview"><Eye size={14} /></a>
                      <button onClick={() => setEmbedFor(f)} style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }} title="Embed code"><Code size={14} /></button>
                      <button onClick={async () => { if (confirm(`Delete “${f.name}”?`)) { await deleteFormAction(f.id); router.refresh(); } }} style={{ color: "#DC2626", background: "none", border: "none", cursor: "pointer" }} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// ================= BUILDER =================
function FormBuilder({ initial, lists, onBack, onListsChanged }: {
  initial: FormRow; lists: ListRow[]; onBack: () => void; onListsChanged: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("Design");
  const [name, setName] = useState(initial.name);
  const [type, setType] = useState<FormType>(initial.type);
  const [targetListId, setTargetListId] = useState<number | null>(initial.targetListId);
  const [fields, setFields] = useState<FormField[]>(initial.fields.length ? initial.fields : defaultForm(lists).fields);
  const [design, setDesign] = useState<FormDesign>(initial.design ?? defaultForm(lists).design!);
  const [targeting, setTargeting] = useState<FormTargeting>(initial.targeting ?? defaultForm(lists).targeting!);
  const [success, setSuccess] = useState<FormSuccess>(initial.success ?? defaultForm(lists).success!);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formId, setFormId] = useState(initial.id);
  const [slug, setSlug] = useState(initial.slug);
  const [status, setStatus] = useState<FormStatus>(initial.status);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  const isNew = formId === 0;
  const tabs = ["Design", "Targeting", "Behavior"];

  const addField = (p: { label: string; type: FieldType }) =>
    setFields((prev) => [...prev, { id: rid(), type: p.type, label: p.label, required: p.type === "email", options: p.type === "select" ? ["Option 1", "Option 2"] : undefined }]);
  const removeField = (id: string) => setFields((prev) => prev.filter((f) => f.id !== id));
  const patchField = (id: string, patch: Partial<FormField>) => setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  async function save(activate = false, openEmbed = false) {
    setSaving(true); setError("");
    try {
      const newStatus: FormStatus = activate ? "active" : status;
      const input = { name, type, status: newStatus, targetListId, fields, design, targeting, success };
      if (formId === 0) {
        const r = await createFormAction(input);
        setFormId(r.id); setSlug(r.slug);
      } else {
        const r = await updateFormAction(formId, input);
        setSlug(r.slug);
      }
      setStatus(newStatus);
      setSaving(false);
      setSavedNote(true);
      window.setTimeout(() => setSavedNote(false), 2000);
      router.refresh();
      if (openEmbed) setEmbedOpen(true);
    } catch (e) {
      setError((e as Error).message); setSaving(false);
    }
  }

  async function addList() {
    const n = prompt("New list name:");
    if (!n) return;
    const { id } = await createListAction(n);
    setTargetListId(id);
    onListsChanged();
  }

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden" style={{ fontFamily: font }}>
      {embedOpen && (
        <EmbedModal
          form={{ id: formId, name, slug, type, status, impressions: 0, submissions: 0, targetListId, fields, design, targeting, success, updatedAt: "" }}
          onClose={() => setEmbedOpen(false)}
        />
      )}
      {/* Left: field palette */}
      <div className="p-4 space-y-2 lg:overflow-y-auto" style={{ width: "100%", maxWidth: 220, background: "#FFFFFF", borderRight: "1px solid var(--border)", flexShrink: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 4 }}>ADD FIELDS</p>
        {PALETTE.map((p) => (
          <button key={p.label} onClick={() => addField(p)} className="w-full flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ border: "1px solid var(--border)", fontSize: 12, color: "#475569", background: "#fff", cursor: "pointer", textAlign: "left" }}>
            <Plus size={12} /> {p.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: "#F8FAFC" }}>
        <div className="flex items-center gap-3 px-5 flex-wrap" style={{ minHeight: 48, background: "#FFFFFF", borderBottom: "1px solid var(--border)", paddingTop: 6, paddingBottom: 6 }}>
          <button onClick={onBack} style={{ fontSize: 12, color: "#2563EB", background: "none", border: "none", cursor: "pointer" }}>← Forms</button>
          <span style={{ color: "#CBD5E1" }}>|</span>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", border: "1px solid transparent", borderRadius: 6, padding: "3px 6px", outline: "none", minWidth: 160 }}
            onFocus={(e) => (e.currentTarget.style.border = "1px solid var(--border)")} onBlur={(e) => (e.currentTarget.style.border = "1px solid transparent")} />
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#F1F5F9" }}>
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ fontSize: 11, fontWeight: 500, padding: "3px 12px", borderRadius: 5, background: tab === t ? "#FFFFFF" : "transparent", color: tab === t ? "#0F172A" : "#64748B", border: tab === t ? "1px solid var(--border)" : "none", cursor: "pointer" }}>{t}</button>
            ))}
          </div>
          <div className="flex-1" />
          {savedNote && <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 500 }}>Saved ✓</span>}
          {!isNew && slug && <a href={`/f/${slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#64748B", padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 6, textDecoration: "none" }}>Preview</a>}
          <button disabled={saving} onClick={() => save(status === "active", true)} className="flex items-center gap-1" style={{ fontSize: 12, color: "#334155", background: "#fff", padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }}><Code size={12} /> Embed code</button>
          <button disabled={saving} onClick={() => save(false)} style={{ fontSize: 12, color: "#334155", background: "#fff", padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }}>{saving ? "Saving…" : "Save draft"}</button>
          <button disabled={saving} onClick={() => save(true)} style={{ fontSize: 12, color: "#FFFFFF", background: "#2563EB", padding: "5px 14px", border: "none", borderRadius: 6, fontWeight: 500, cursor: "pointer" }}>Activate</button>
        </div>

        {error && <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 12, padding: "8px 16px", borderBottom: "1px solid #FECACA" }}>{error}</div>}

        <div className="flex-1 lg:overflow-y-auto flex items-start justify-center p-6">
          <div className="rounded-xl shadow-2xl overflow-hidden" style={{ width: "100%", maxWidth: 400, background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <div style={{ height: 6, background: design.accentColor }} />
            <div className="p-7">
              <input value={design.title} onChange={(e) => setDesign({ ...design, title: e.target.value })} style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", border: "1px solid transparent", borderRadius: 6, width: "100%", outline: "none", marginBottom: 6, padding: 2 }} onFocus={(e) => (e.currentTarget.style.border = "1px solid var(--border)")} onBlur={(e) => (e.currentTarget.style.border = "1px solid transparent")} />
              <textarea value={design.description} onChange={(e) => setDesign({ ...design, description: e.target.value })} rows={2} style={{ fontSize: 13, color: "#64748B", border: "1px solid transparent", borderRadius: 6, width: "100%", outline: "none", marginBottom: 18, padding: 2, resize: "vertical", fontFamily: font }} onFocus={(e) => (e.currentTarget.style.border = "1px solid var(--border)")} onBlur={(e) => (e.currentTarget.style.border = "1px solid transparent")} />
              <div className="space-y-3">
                {fields.map((f) => (
                  <div key={f.id} className="group" style={{ position: "relative", border: "1px dashed transparent", borderRadius: 8, padding: 2 }}
                    onMouseEnter={(e) => (e.currentTarget.style.border = "1px dashed #CBD5E1")} onMouseLeave={(e) => (e.currentTarget.style.border = "1px dashed transparent")}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <input value={f.label} onChange={(e) => patchField(f.id, { label: e.target.value })} style={{ fontSize: 11, fontWeight: 500, color: "#475569", border: "none", outline: "none", background: "transparent" }} />
                      <div className="flex items-center gap-2">
                        <label style={{ fontSize: 10, color: "#94A3B8", display: "flex", alignItems: "center", gap: 3 }}>
                          <input type="checkbox" checked={f.required} onChange={(e) => patchField(f.id, { required: e.target.checked })} /> req
                        </label>
                        <button onClick={() => removeField(f.id)} style={{ color: "#DC2626", background: "none", border: "none", cursor: "pointer" }}><X size={12} /></button>
                      </div>
                    </div>
                    {f.type === "textarea" ? (
                      <textarea disabled placeholder={f.label} style={{ width: "100%", fontSize: 13, padding: "9px 11px", border: "1px solid #E2E8F0", borderRadius: 6, background: "#F8FAFC" }} />
                    ) : f.type === "checkbox" ? (
                      <label style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" disabled /> {f.label}</label>
                    ) : f.type === "select" ? (
                      <select disabled style={{ width: "100%", fontSize: 13, padding: "9px 11px", border: "1px solid #E2E8F0", borderRadius: 6, background: "#F8FAFC" }}>{(f.options ?? []).map((o) => <option key={o}>{o}</option>)}</select>
                    ) : (
                      <input disabled placeholder={f.label} style={{ width: "100%", fontSize: 13, padding: "9px 11px", border: "1px solid #E2E8F0", borderRadius: 6, background: "#F8FAFC" }} />
                    )}
                  </div>
                ))}
                {fields.length === 0 && <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", padding: "12px 0" }}>Add fields from the left →</p>}
                <button style={{ width: "100%", fontSize: 13, fontWeight: 600, padding: "11px", background: design.accentColor, color: "#FFFFFF", border: "none", borderRadius: 6, cursor: "default" }}>{design.submitText}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right config */}
      <div className="p-5 lg:overflow-y-auto space-y-5" style={{ width: "100%", maxWidth: 270, background: "#FFFFFF", borderLeft: "1px solid var(--border)", flexShrink: 0 }}>
        {tab === "Design" && (
          <>
            <Section title="FORM TYPE">
              <select value={type === "embed" || type === "hosted" ? type : "embed"} onChange={(e) => setType(e.target.value as FormType)} style={selectStyle}>
                {(["embed", "hosted"] as FormType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
              <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>
                {type === "hosted" ? "Hosted: share a link to the form's own page." : "Embed: paste a snippet onto any site (auto-resizes)."}
              </p>
            </Section>
            <Section title="TARGET LIST (subscribers go here)">
              <select value={targetListId ?? ""} onChange={(e) => setTargetListId(e.target.value ? Number(e.target.value) : null)} style={selectStyle}>
                <option value="">— none —</option>
                {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button onClick={addList} style={{ fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", marginTop: 6 }}>+ New list</button>
            </Section>
            <Section title="ACCENT COLOR">
              <div className="flex gap-2">
                {["#2563EB", "#7C3AED", "#DC2626", "#16A34A", "#0F172A"].map((c) => (
                  <button key={c} onClick={() => setDesign({ ...design, accentColor: c })} className="rounded" style={{ width: 26, height: 26, background: c, border: design.accentColor === c ? "2px solid #0F172A" : "1px solid var(--border)", cursor: "pointer" }} />
                ))}
              </div>
            </Section>
            <Section title="SUBMIT BUTTON TEXT">
              <input value={design.submitText} onChange={(e) => setDesign({ ...design, submitText: e.target.value })} style={selectStyle} />
            </Section>
          </>
        )}
        {tab === "Targeting" && (
          <>
            <Section title="SHOW ON URLS"><input value={targeting.urls} onChange={(e) => setTargeting({ ...targeting, urls: e.target.value })} placeholder="*/blog/*" style={selectStyle} /></Section>
            <Section title="DEVICE">
              <select value={targeting.device} onChange={(e) => setTargeting({ ...targeting, device: e.target.value as FormTargeting["device"] })} style={selectStyle}>
                <option value="all">All devices</option><option value="desktop">Desktop only</option><option value="mobile">Mobile only</option>
              </select>
            </Section>
          </>
        )}
        {tab === "Behavior" && (
          <>
            <Section title="TRIGGER">
              <select value={success.trigger} onChange={(e) => setSuccess({ ...success, trigger: e.target.value })} style={selectStyle}>
                <option value="immediately">Immediately</option><option value="after_30s">After 30 seconds</option><option value="exit_intent">On exit intent</option><option value="scroll_50">After scrolling 50%</option>
              </select>
            </Section>
            <Section title="SUCCESS ACTION">
              <select value={success.action} onChange={(e) => setSuccess({ ...success, action: e.target.value as FormSuccess["action"] })} style={selectStyle}>
                <option value="message">Show thank-you message</option><option value="redirect">Redirect to URL</option><option value="close">Close popup</option>
              </select>
            </Section>
            {success.action === "message" && <Section title="MESSAGE"><input value={success.message ?? ""} onChange={(e) => setSuccess({ ...success, message: e.target.value })} style={selectStyle} /></Section>}
            {success.action === "redirect" && <Section title="REDIRECT URL"><input value={success.redirectUrl ?? ""} onChange={(e) => setSuccess({ ...success, redirectUrl: e.target.value })} placeholder="https://…" style={selectStyle} /></Section>}
          </>
        )}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = { width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, outline: "none", fontFamily: font, boxSizing: "border-box" };
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 8 }}>{title}</p>
      {children}
    </div>
  );
}

// ================= EMBED MODAL =================
function EmbedModal({ form, onClose }: { form: FormRow; onClose: () => void }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-app";
  const url = `${origin}/f/${form.slug}`;
  const script = `<script src="${origin}/embed.js" data-form="${form.slug}" data-max-width="460" async></script>`;
  const iframe = `<iframe\n  src="${url}?embed=1"\n  style="width:100%;max-width:460px;height:540px;border:0;"\n  title="${form.name}">\n</iframe>`;
  const isEmbed = form.type === "embed";
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string) => { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500); };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 200 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(560px, 92vw)", background: "#FFFFFF", borderRadius: 12, padding: 24, border: "1px solid var(--border)", boxShadow: "0 16px 48px rgba(15,23,42,0.16)", zIndex: 201, fontFamily: font }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Embed “{form.name}”</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} color="#94A3B8" /></button>
        </div>

        {form.status !== "active" && <p style={{ fontSize: 12, color: "#C2410C", background: "#FFF7ED", padding: "8px 10px", borderRadius: 6, marginBottom: 14 }}>This form is <b>{form.status}</b> — activate it so submissions are accepted.</p>}

        {isEmbed ? (
          <>
            <Block label="① Script embed — recommended (auto-resizes, paste on any site / Shopify)" value={script} copied={copied === "script"} onCopy={() => copy("script", script)} mono />
            <Block label="② iframe (fixed height fallback)" value={iframe} copied={copied === "iframe"} onCopy={() => copy("iframe", iframe)} mono />
            <Block label="Hosted URL (also works as a shareable link)" value={url} copied={copied === "url"} onCopy={() => copy("url", url)} />
          </>
        ) : (
          <>
            <Block label="① Hosted URL — share this link" value={url} copied={copied === "url"} onCopy={() => copy("url", url)} />
            <Block label="② Embed it instead (auto-resizing script)" value={script} copied={copied === "script"} onCopy={() => copy("script", script)} mono />
          </>
        )}
        <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>The script embed injects an auto-resizing iframe — no CORS setup needed. Works on Shopify, WordPress, and plain HTML.</p>
      </div>
    </>
  );
}

function Block({ label, value, copied, onCopy, mono }: { label: string; value: string; copied: boolean; onCopy: () => void; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>{label}</span>
        <button onClick={onCopy} className="flex items-center gap-1" style={{ fontSize: 11, color: copied ? "#16A34A" : "#2563EB", background: "none", border: "none", cursor: "pointer" }}>
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <pre style={{ fontSize: 11, color: "#0F172A", background: "#F8FAFC", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", overflowX: "auto", whiteSpace: "pre-wrap", fontFamily: mono ? "JetBrains Mono, monospace" : font, margin: 0 }}>{value}</pre>
    </div>
  );
}
