"use client";

import { LayoutTemplate, FileText, Plus, Pencil, Trash2, Copy, X, ArrowRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
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

function TemplateEditor({ id, onClose, onSaved }: { id: number | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id == null) return;
    getTemplate(id).then((t) => {
      if (t) { setName(t.name); setSubject(t.subjectDefault || ""); setBody(t.htmlBody || ""); }
      setLoading(false);
    });
  }, [id]);

  const input = { width: "100%", fontSize: 13, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, outline: "none", color: "#0F172A", fontFamily: font, boxSizing: "border-box" as const };

  const save = async () => {
    if (!name.trim()) { alert("Template name is required."); return; }
    setBusy(true);
    const payload = { name: name.trim(), subjectDefault: subject.trim(), htmlBody: body };
    const ok = id != null ? await updateTemplate(id, payload) : (await createTemplate(payload)).ok;
    setBusy(false);
    if (ok) onSaved(); else alert("Save failed.");
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.4)" }}>
      <div onClick={(e) => e.stopPropagation()} className="rounded-xl" style={{ background: "#FFFFFF", width: 720, maxWidth: "92vw", maxHeight: "90vh", overflow: "auto", fontFamily: font }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{id != null ? "Edit template" : "New template"}</h3>
          <button onClick={onClose} style={{ color: "#94A3B8", cursor: "pointer" }}><X size={16} /></button>
        </div>
        {loading ? (
          <p style={{ fontSize: 13, color: "#94A3B8", padding: 24 }}>Loading…</p>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 6 }}>Template name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. June Promo" style={input} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 6 }}>Subject line</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Your June deals are here 🎉" style={input} />
            </div>
            <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 6 }}>Body (HTML)</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} placeholder="<h1>Hello</h1><p>…</p>" style={{ ...input, fontFamily: "monospace", fontSize: 12, resize: "vertical" }} />
                <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>HTML editor — the Unlayer drag-and-drop builder (design JSON) comes later.</p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 6 }}>Preview</label>
                <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)", background: "#F8FAFC", minHeight: 240, fontSize: 13, color: "#0F172A", overflow: "auto" }}
                  dangerouslySetInnerHTML={{ __html: body || "<p style='color:#94A3B8'>Nothing to preview yet.</p>" }} />
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} disabled={busy} style={{ fontSize: 12, fontWeight: 500, color: "#64748B", background: "#F1F5F9", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
          <button onClick={save} disabled={busy || loading} style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: "#2563EB", border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Saving…" : id != null ? "Save changes" : "Create template"}
          </button>
        </div>
      </div>
    </div>
  );
}
