"use client";

import { LayoutTemplate, FileText, Plus, Pencil, Trash2, Copy, X, ArrowRight } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, type Template } from "@/lib/templates";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
const fmtDate = (d?: string | null) => { if (!d) return "—"; const x = new Date(d); return isNaN(+x) ? "—" : x.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };

export function ContentView() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);

  const reload = useCallback(async () => { setLoading(true); setTemplates(await listTemplates()); setLoading(false); }, []);
  useEffect(() => { reload(); }, [reload]);

  const onDelete = async (id: number) => {
    if (!confirm("Archive this template?")) return;
    if (await deleteTemplate(id)) reload(); else alert("Delete failed.");
  };
  const onDuplicate = async (id: number) => {
    if (await duplicateTemplate(id)) reload(); else alert("Duplicate failed.");
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: font }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#0F172A" }}>Content</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>Reusable email templates your campaigns and automations deliver.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/forms" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2"
            style={{ fontSize: 12, fontWeight: 500, background: "#FFFFFF", border: "1px solid var(--border)", color: "#64748B", textDecoration: "none" }}>
            <FileText size={13} /> Forms <ArrowRight size={12} />
          </Link>
          <button onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2"
            style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
            <Plus size={13} /> New Template
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#94A3B8" }}>Loading templates…</p>
      ) : templates.length === 0 ? (
        <EmptyState icon={LayoutTemplate} title="No templates yet" description="Create a reusable email template, then pick it from any campaign."
          action={<button onClick={() => setEditing("new")} className="rounded-lg px-4 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>Create your first template</button>} />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl p-4 flex flex-col" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div className="flex items-start justify-between mb-2">
                <div className="rounded-lg flex items-center justify-center" style={{ width: 34, height: 34, background: "#EFF6FF" }}>
                  <LayoutTemplate size={16} color="#2563EB" />
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => onDuplicate(t.id)} title="Duplicate" style={{ color: "#64748B", cursor: "pointer" }}><Copy size={13} /></button>
                  <button onClick={() => setEditing(t.id)} title="Edit" style={{ color: "#64748B", cursor: "pointer" }}><Pencil size={13} /></button>
                  <button onClick={() => onDelete(t.id)} title="Archive" style={{ color: "#DC2626", cursor: "pointer" }}><Trash2 size={13} /></button>
                </div>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{t.name}</p>
              <p className="truncate" style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{t.subjectDefault || "No subject"}</p>
              <p style={{ fontSize: 11, color: "#94A3B8", marginTop: "auto", paddingTop: 12 }}>
                {t.category ? <span className="rounded-full px-2 py-0.5" style={{ background: "#F1F5F9", marginRight: 6 }}>{t.category}</span> : null}
                Updated {fmtDate(t.updatedAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <TemplateEditor id={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
    </div>
  );
}

/** Beehiiv-style email-size gauge (warns near Gmail's ~102KB clip limit). */
function SizeGauge({ pct, kb }: { pct: number; kb: number }) {
  const offset = 126 - (126 * Math.min(pct, 100)) / 100;
  const color = pct > 90 ? "#DC2626" : pct > 60 ? "#D97706" : "#9CA3AF";
  return (
    <div className="hidden md:flex items-center gap-1.5" title={`Email size ~${kb.toFixed(0)}KB${pct >= 100 ? " — may be clipped by Gmail (102KB)" : ""}`}>
      <svg viewBox="-8 0 116 56" style={{ width: 26, height: 14 }} aria-hidden="true">
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E5E7EB" strokeWidth="10" strokeLinecap="round" />
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray="126" strokeDashoffset={offset} />
      </svg>
      <span style={{ fontSize: 11, color, fontVariantNumeric: "tabular-nums" }}>{kb.toFixed(0)}KB</span>
    </div>
  );
}

function TemplateEditor({ id, onClose, onSaved }: { id: number | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [design, setDesign] = useState<unknown>(null);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [savedState, setSavedState] = useState<"synced" | "saving" | "unsaved">("synced");
  const skipFirstEdit = useRef(true);

  useEffect(() => {
    if (id == null) return;
    getTemplate(id).then((t) => {
      if (t) { setName(t.name); setSubject(t.subjectDefault || ""); setBody(t.htmlBody || ""); setDesign(t.design ?? null); }
      setLoading(false);
    });
  }, [id]);

  // Autosave (existing templates) — debounced PATCH after edits stop.
  useEffect(() => {
    if (loading) return;
    if (skipFirstEdit.current) { skipFirstEdit.current = false; return; }
    if (id == null) { setSavedState("unsaved"); return; } // new template saves on Create
    setSavedState("unsaved");
    const t = setTimeout(async () => {
      setSavedState("saving");
      const ok = await updateTemplate(id, { name: name.trim() || "Untitled template", subjectDefault: subject.trim(), htmlBody: body, design });
      setSavedState(ok ? "synced" : "unsaved");
    }, 1200);
    return () => clearTimeout(t);
  }, [name, subject, body, design, id, loading]);

  const save = async () => {
    if (!name.trim()) { alert("Template name is required."); return; }
    setBusy(true);
    const payload = { name: name.trim(), subjectDefault: subject.trim(), htmlBody: body, design };
    const ok = id != null ? await updateTemplate(id, payload) : (await createTemplate(payload)).ok;
    setBusy(false);
    if (ok) onSaved(); else alert("Save failed.");
  };

  const wordCount = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const sizeBytes = typeof window !== "undefined" ? new Blob([body]).size : body.length;
  const sizePct = Math.min(100, (sizeBytes / 102400) * 100); // Gmail clips ~102KB
  const sync = busy ? "saving" : savedState;
  const syncLabel = sync === "saving" ? "Saving…" : sync === "unsaved" ? "Unsaved" : "Synced";
  const syncColor = sync === "saving" ? "#94A3B8" : sync === "unsaved" ? "#D97706" : "#22C55E";

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#FFFFFF", fontFamily: font }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 shrink-0" style={{ height: 56, borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} title="Close" className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, color: "#64748B", background: "#F1F5F9", cursor: "pointer" }}><X size={16} /></button>
          <div className="flex items-center gap-2 rounded-md px-2.5 py-1" style={{ background: "#F1F5F9", fontSize: 12, color: "#64748B" }}>
            <span style={{ fontWeight: 500 }}>Draft</span>
            <span style={{ color: "#CBD5E1" }}>|</span>
            <span className="flex items-center gap-1.5" style={{ color: syncColor }}>{syncLabel}<span style={{ width: 7, height: 7, borderRadius: 999, background: syncColor }} /></span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SizeGauge pct={sizePct} kb={sizeBytes / 1024} />
          <span className="hidden md:inline" style={{ fontSize: 12, color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>{wordCount} words</span>
          <button onClick={onClose} disabled={busy} style={{ fontSize: 13, fontWeight: 500, color: "#64748B", background: "transparent", border: "none", padding: "7px 12px", cursor: "pointer" }}>Cancel</button>
          <button onClick={save} disabled={busy || loading} style={{ fontSize: 13, fontWeight: 500, color: "#FFFFFF", background: "#0F172A", border: "none", padding: "7px 18px", borderRadius: 8, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : id != null ? "Save" : "Create"}</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p style={{ fontSize: 13, color: "#94A3B8", padding: 40, textAlign: "center" }}>Loading…</p>
        ) : (
          <div className="mx-auto px-5" style={{ maxWidth: 680, paddingTop: 40 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Untitled template"
              style={{ width: "100%", fontSize: 12, fontWeight: 500, color: "#94A3B8", border: "none", outline: "none", background: "transparent", marginBottom: 18, fontFamily: font, letterSpacing: "0.02em", textTransform: "uppercase" }} />
            <textarea value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Add a subject line" rows={1}
              ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
              onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
              style={{ width: "100%", fontSize: 36, fontWeight: 700, color: "#0F172A", border: "none", outline: "none", background: "transparent", resize: "none", lineHeight: 1.15, letterSpacing: "-0.02em", fontFamily: font, marginBottom: 14, overflow: "hidden" }} />
            <RichTextEditor value={body} onChange={(html, json) => { setBody(html); setDesign(json); }} placeholder="Start writing your email…" bare />
          </div>
        )}
      </div>
    </div>
  );
}
