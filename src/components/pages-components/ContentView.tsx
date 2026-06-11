"use client";

import { LayoutTemplate, FileText, Plus, Pencil, Trash2, X, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTemplates, saveTemplate, deleteTemplate, type MockTemplate } from "@/lib/mockTemplates";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
const fmtDate = (d: string) => { const x = new Date(d); return isNaN(+x) ? "—" : x.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };

export function ContentView() {
  const [templates, setTemplates] = useState<MockTemplate[]>([]);
  const [editing, setEditing] = useState<MockTemplate | "new" | null>(null);

  useEffect(() => { setTemplates(getTemplates()); }, []);

  const onDelete = (id: string) => {
    if (!confirm("Delete this template?")) return;
    setTemplates(deleteTemplate(id));
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: font }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#0F172A" }}>Content</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>
            Reusable email templates your campaigns and automations deliver.
            <span style={{ color: "#B45309", marginLeft: 6 }}>· mock data (no backend yet)</span>
          </p>
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

      {templates.length === 0 ? (
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
                <div className="flex gap-1">
                  <button onClick={() => setEditing(t)} title="Edit" style={{ color: "#64748B", cursor: "pointer" }}><Pencil size={13} /></button>
                  <button onClick={() => onDelete(t.id)} title="Delete" style={{ color: "#DC2626", cursor: "pointer" }}><Trash2 size={13} /></button>
                </div>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{t.name}</p>
              <p className="truncate" style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{t.subject}</p>
              <p style={{ fontSize: 11, color: "#94A3B8", marginTop: "auto", paddingTop: 12 }}>Updated {fmtDate(t.updatedAt)}</p>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TemplateEditor
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setTemplates(getTemplates()); setEditing(null); }}
        />
      )}
    </div>
  );
}

function TemplateEditor({ template, onClose, onSaved }: { template: MockTemplate | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const input = { width: "100%", fontSize: 13, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, outline: "none", color: "#0F172A", fontFamily: font, boxSizing: "border-box" as const };

  const save = () => {
    if (!name.trim() || !subject.trim()) { alert("Name and subject are required."); return; }
    saveTemplate({ id: template?.id, name: name.trim(), subject: subject.trim(), body });
    onSaved();
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.4)" }}>
      <div onClick={(e) => e.stopPropagation()} className="rounded-xl" style={{ background: "#FFFFFF", width: 720, maxWidth: "92vw", maxHeight: "90vh", overflow: "auto", fontFamily: font }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{template ? "Edit template" : "New template"}</h3>
          <button onClick={onClose} style={{ color: "#94A3B8", cursor: "pointer" }}><X size={16} /></button>
        </div>
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
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} placeholder="<h1>Hello</h1><p>…</p>"
                style={{ ...input, fontFamily: "monospace", fontSize: 12, resize: "vertical" }} />
              <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Mock editor — the real one is the Unlayer drag-and-drop builder.</p>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 6 }}>Preview</label>
              <div className="rounded-lg p-3" style={{ border: "1px solid var(--border)", background: "#F8FAFC", minHeight: 240, fontSize: 13, color: "#0F172A", overflow: "auto" }}
                dangerouslySetInnerHTML={{ __html: body || "<p style='color:#94A3B8'>Nothing to preview yet.</p>" }} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} style={{ fontSize: 12, fontWeight: 500, color: "#64748B", background: "#F1F5F9", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
          <button onClick={save} style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: "#2563EB", border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer" }}>{template ? "Save changes" : "Create template"}</button>
        </div>
      </div>
    </div>
  );
}
