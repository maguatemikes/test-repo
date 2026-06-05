"use client";

import { FileText, Plus, Eye, Code, MoreHorizontal, MousePointerClick, Users } from "lucide-react";
import { useState } from "react";

const forms = [
  { id: 1, name: "Newsletter Signup Popup", type: "Popup", status: "active", impressions: 24810, submissions: 1488, rate: "6.0%", list: "Newsletter", updated: "Jun 2, 2026" },
  { id: 2, name: "Footer Email Capture", type: "Embed", status: "active", impressions: 81200, submissions: 2436, rate: "3.0%", list: "Newsletter", updated: "May 28, 2026" },
  { id: 3, name: "Exit Intent Discount", type: "Popup", status: "active", impressions: 9840, submissions: 1280, rate: "13.0%", list: "Discount Seekers", updated: "May 15, 2026" },
  { id: 4, name: "Blog Sidebar Opt-in", type: "Slide-in", status: "paused", impressions: 3200, submissions: 96, rate: "3.0%", list: "Blog Readers", updated: "Apr 30, 2026" },
  { id: 5, name: "Product Launch Waitlist", type: "Full-screen", status: "draft", impressions: 0, submissions: 0, rate: "—", list: "Waitlist", updated: "Jun 3, 2026" },
];

const typeColors: Record<string, { bg: string; color: string }> = {
  Popup: { bg: "#EFF6FF", color: "#1D4ED8" },
  Embed: { bg: "#F0FDF4", color: "#15803D" },
  "Slide-in": { bg: "#F5F3FF", color: "#6D28D9" },
  "Full-screen": { bg: "#FFF7ED", color: "#C2410C" },
};

const statusDot: Record<string, string> = {
  active: "#22C55E",
  paused: "#F97316",
  draft: "#94A3B8",
};

export function FormsView() {
  const [buildingForm, setBuildingForm] = useState(false);

  if (buildingForm) {
    return <FormBuilder onBack={() => setBuildingForm(false)} />;
  }

  return (
    <div className="p-6 space-y-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, color: "#64748B" }}>
          <strong style={{ color: "#0F172A" }}>5</strong> forms · <strong style={{ color: "#16A34A" }}>3</strong> active
        </p>
        <button
          onClick={() => setBuildingForm(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2"
          style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF" }}
        >
          <Plus size={13} />
          New Form
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Impressions", value: "119,050", icon: Eye, color: "#2563EB" },
          { label: "Total Submissions", value: "5,300", icon: Users, color: "#16A34A" },
          { label: "Avg Conversion", value: "4.5%", icon: MousePointerClick, color: "#7C3AED" },
          { label: "Active Forms", value: "3", icon: FileText, color: "#F59E0B" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-lg p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} color={k.color} />
                <span style={{ fontSize: 11, color: "#64748B" }}>{k.label}</span>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", fontFamily: "'JetBrains Mono', monospace" }}>{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Forms list */}
      <div className="rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto"><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
              {["Form Name", "Type", "Status", "Impressions", "Submissions", "Conv. Rate", "Linked List", "Updated", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", padding: "9px 14px" }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forms.map((f, i) => {
              const tc = typeColors[f.type];
              return (
                <tr
                  key={f.id}
                  style={{ borderBottom: i < forms.length - 1 ? "1px solid #F8FAFC" : "none", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 14px" }}>
                    <div className="flex items-center gap-2">
                      <FileText size={13} color="#94A3B8" />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{f.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: tc.bg, color: tc.color }}>
                      {f.type}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full" style={{ width: 6, height: 6, background: statusDot[f.status], display: "inline-block" }} />
                      <span style={{ fontSize: 12, color: "#64748B" }}>{f.status.charAt(0).toUpperCase() + f.status.slice(1)}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#0F172A" }}>
                    {f.impressions > 0 ? f.impressions.toLocaleString() : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#0F172A" }}>
                    {f.submissions > 0 ? f.submissions.toLocaleString() : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: f.rate !== "—" ? "#7C3AED" : "#CBD5E1" }}>
                    {f.rate}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, background: "#EFF6FF", color: "#1D4ED8" }}>{f.list}</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: "#64748B" }}>{f.updated}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div className="flex items-center gap-1">
                      <button style={{ color: "#94A3B8" }} title="Preview"><Eye size={13} /></button>
                      <button style={{ color: "#94A3B8" }} title="Embed code"><Code size={13} /></button>
                      <button style={{ color: "#94A3B8" }}><MoreHorizontal size={13} /></button>
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

function FormBuilder({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState("Design");
  const tabs = ["Design", "Targeting", "Behavior"];

  return (
    <div className="flex h-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Left sidebar - field palette */}
      <div className="p-4 space-y-4 overflow-y-auto" style={{ width: 220, background: "#FFFFFF", borderRight: "1px solid var(--border)" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em" }}>FIELDS</p>
        {["Email", "First Name", "Last Name", "Phone", "Checkbox", "Dropdown", "Text Area"].map((f) => (
          <div
            key={f}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-grab"
            style={{ border: "1px solid var(--border)", fontSize: 12, color: "#64748B" }}
          >
            <span style={{ width: 6, height: 6, background: "#CBD5E1", borderRadius: 2, display: "inline-block" }} />
            {f}
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col" style={{ background: "#F8FAFC" }}>
        <div className="flex items-center gap-4 px-5" style={{ height: 48, background: "#FFFFFF", borderBottom: "1px solid var(--border)" }}>
          <button onClick={onBack} style={{ fontSize: 12, color: "#2563EB" }}>← Forms</button>
          <span style={{ color: "#CBD5E1" }}>|</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Newsletter Signup Popup</span>
          <div className="flex gap-1 p-1 rounded-lg ml-4" style={{ background: "#F1F5F9" }}>
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "3px 12px",
                  borderRadius: 5,
                  background: tab === t ? "#FFFFFF" : "transparent",
                  color: tab === t ? "#0F172A" : "#64748B",
                  border: tab === t ? "1px solid var(--border)" : "none",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button style={{ fontSize: 12, color: "#64748B", padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 6 }}>Preview</button>
          <button style={{ fontSize: 12, color: "#FFFFFF", background: "#2563EB", padding: "5px 14px", border: "none", borderRadius: 6, fontWeight: 500 }}>Activate</button>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          {/* Form preview */}
          <div className="rounded-xl shadow-2xl overflow-hidden" style={{ width: 380, background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <div style={{ height: 6, background: "linear-gradient(90deg, #2563EB, #7C3AED)" }} />
            <div className="p-8">
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>Join our newsletter</h3>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 24 }}>Get weekly deals, new arrivals, and exclusive offers delivered to your inbox.</p>
              <div className="space-y-3">
                <input placeholder="First name" style={{ width: "100%", fontSize: 13, padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 6, outline: "none" }} />
                <input placeholder="Email address" style={{ width: "100%", fontSize: 13, padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 6, outline: "none" }} />
                <button style={{ width: "100%", fontSize: 13, fontWeight: 600, padding: "11px", background: "#2563EB", color: "#FFFFFF", border: "none", borderRadius: 6, cursor: "pointer" }}>
                  Subscribe →
                </button>
              </div>
              <p style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", marginTop: 12 }}>No spam. Unsubscribe anytime.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right config */}
      <div className="p-5 overflow-y-auto space-y-5" style={{ width: 260, background: "#FFFFFF", borderLeft: "1px solid var(--border)" }}>
        {tab === "Design" && (
          <>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 10 }}>FORM TYPE</p>
              <select style={{ width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }}>
                <option>Popup</option>
                <option>Embed</option>
                <option>Slide-in</option>
                <option>Full-screen</option>
              </select>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 10 }}>ACCENT COLOR</p>
              <div className="flex gap-2">
                {["#2563EB", "#7C3AED", "#DC2626", "#16A34A", "#0F172A"].map((c) => (
                  <button key={c} className="rounded" style={{ width: 24, height: 24, background: c, border: c === "#2563EB" ? "2px solid #0F172A" : "1px solid var(--border)" }} />
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 10 }}>SUBMIT BUTTON TEXT</p>
              <input defaultValue="Subscribe →" style={{ width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }} />
            </div>
          </>
        )}
        {tab === "Targeting" && (
          <div className="space-y-4">
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 10 }}>SHOW ON URLS</p>
              <input defaultValue="*/blog/*" style={{ width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 10 }}>DEVICE</p>
              <select style={{ width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }}>
                <option>All devices</option>
                <option>Desktop only</option>
                <option>Mobile only</option>
              </select>
            </div>
          </div>
        )}
        {tab === "Behavior" && (
          <div className="space-y-4">
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 10 }}>TRIGGER</p>
              <select style={{ width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }}>
                <option>After 30 seconds</option>
                <option>On exit intent</option>
                <option>After scrolling 50%</option>
                <option>Immediately</option>
              </select>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 10 }}>SUCCESS ACTION</p>
              <select style={{ width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }}>
                <option>Show thank-you message</option>
                <option>Redirect to URL</option>
                <option>Close popup</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}