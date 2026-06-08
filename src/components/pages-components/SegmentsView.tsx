"use client";

import { Filter, Plus, ChevronLeft, RefreshCw, Copy, Archive, MoreHorizontal, Search, Eye, Play, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

type SegRow = { id: string; name: string; rules: string[]; count: number; status: string };
type Member = { name: string; email: string; spend: string; lastOrder: string };

// Builder member preview is a separate (future) feature; placeholder for now.
const segmentMembers: Member[] = [];

const statusConfig: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  ready: { bg: "#F0FDF4", color: "#15803D", dot: "#22C55E", label: "Ready" },
  stale: { bg: "#FFF7ED", color: "#C2410C", dot: "#F97316", label: "Stale" },
  computing: { bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6", label: "Computing…" },
};

type RuleGroup = { type: "AND" | "OR"; conditions: string[] };

const FACETS = ["Total Revenue", "Last Order Date", "Customer LTV", "Tag", "Source", "Email Opens (last 90d)", "Last Engagement", "Total Orders", "Created Date"];

export function SegmentsView() {
  const [openSegment, setOpenSegment] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [query, setQuery] = useState("");
  const [segments, setSegments] = useState<SegRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Load real segments with live counts.
  useEffect(() => {
    let active = true;
    fetch("/api/segments")
      .then((r) => r.json())
      .then((d) => { if (active) setSegments(d.segments || []); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // Load real member preview when a segment is opened.
  useEffect(() => {
    if (!openSegment) return;
    let active = true;
    setMembersLoading(true);
    setMembers([]);
    fetch(`/api/segments?preview=${encodeURIComponent(openSegment)}`)
      .then((r) => r.json())
      .then((d) => { if (active) setMembers(d.members || []); })
      .catch(() => {})
      .finally(() => { if (active) setMembersLoading(false); });
    return () => { active = false; };
  }, [openSegment]);

  const selectedSegment = segments.find((s) => s.id === openSegment);

  if (building) {
    return <SegmentBuilder onBack={() => setBuilding(false)} />;
  }

  if (openSegment && selectedSegment) {
    return (
      <div className="p-6 space-y-4" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setOpenSegment(null)} className="flex items-center gap-1.5" style={{ fontSize: 12, color: "#2563EB" }}>
            <ChevronLeft size={13} /> Segments
          </button>
          <span style={{ color: "#CBD5E1", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12, color: "#64748B" }}>{selectedSegment.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>{selectedSegment.name}</h2>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Live · evaluated in real-time</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ fontSize: 12, border: "1px solid var(--border)", color: "#64748B", background: "#FFFFFF" }}>
              <RefreshCw size={12} /> Refresh
            </button>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ fontSize: 12, border: "1px solid var(--border)", color: "#64748B", background: "#FFFFFF" }}>
              <Eye size={12} /> Edit Segment
            </button>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ fontSize: 12, background: "#2563EB", color: "#FFFFFF" }}>
              <Play size={12} /> Use in Campaign
            </button>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Matching Contacts", value: selectedSegment.count.toLocaleString() },
            { label: "Rules", value: `${selectedSegment.rules.length} conditions` },
            { label: "Status", value: statusConfig[selectedSegment.status]?.label ?? "Ready" },
            { label: "Evaluation", value: "Real-time" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>{m.label}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Rule definition */}
        <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 12 }}>SEGMENT RULES</p>
          <div className="space-y-2">
            {selectedSegment.rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 600, background: rule.startsWith("OR") ? "#FFF7ED" : "#EFF6FF", color: rule.startsWith("OR") ? "#C2410C" : "#1D4ED8" }}>
                    {rule.startsWith("OR") ? "OR" : "AND"}
                  </span>
                )}
                <div className="rounded-lg px-3 py-2" style={{ background: "#F8FAFC", border: "1px solid var(--border)", fontSize: 12, color: "#0F172A" }}>
                  {rule.replace(/^OR: /, "")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview members */}
        <div className="rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "#F8FAFC" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>Member Preview</span>
            <span style={{ fontSize: 11, color: "#64748B" }}>First 20 shown</span>
          </div>
          <div className="overflow-x-auto"><table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
                {["Name / Email", "Lifetime Spend", "Last Order"].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", padding: "8px 14px" }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {membersLoading ? (
                <tr><td colSpan={3} style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "#94A3B8" }}>Loading members…</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "#94A3B8" }}>No matching members</td></tr>
              ) : members.map((m, i) => (
                <tr key={m.email} style={{ borderBottom: i < members.length - 1 ? "1px solid #F8FAFC" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 14px" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-full flex items-center justify-center text-white"
                        style={{ width: 26, height: 26, background: `hsl(${m.email.charCodeAt(0) * 33}, 55%, 50%)`, fontSize: 10, fontWeight: 500 }}>
                        {m.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{m.name}</p>
                        <p style={{ fontSize: 11, color: "#64748B" }}>{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{m.spend}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>{m.lastOrder}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>
    );
  }

  const filtered = segments.filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="p-6 space-y-4" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, color: "#64748B" }}>
          {loading ? "Loading segments…" : <><strong style={{ fontWeight: 600, color: "#0F172A" }}>{segments.length}</strong> dynamic segments · evaluated live</>}
        </p>
        <button onClick={() => setBuilding(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF" }}>
          <Plus size={13} /> New Segment
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg" style={{ background: "#FFFFFF", border: "1px solid var(--border)", padding: "7px 12px", width: 260 }}>
          <Search size={13} color="#94A3B8" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search segments…"
            style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#0F172A", width: "100%" }} />
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {filtered.map((s) => {
          const sc = statusConfig[s.status];
          return (
            <div
              key={s.id}
              className="rounded-xl p-4 cursor-pointer"
              style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
              onClick={() => setOpenSegment(s.id)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(15,23,42,0.08)")}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="rounded-lg flex items-center justify-center" style={{ width: 32, height: 32, background: "#EFF6FF" }}>
                  <Filter size={14} color="#2563EB" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.color }}>
                    <span className="rounded-full" style={{ width: 5, height: 5, background: sc.dot, display: "inline-block" }} />
                    {sc.label}
                  </span>
                  <button style={{ color: "#94A3B8" }} onClick={(e) => e.stopPropagation()}><MoreHorizontal size={13} /></button>
                </div>
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>{s.name}</h3>
              <div className="space-y-1.5 mb-4">
                {s.rules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span className="rounded-full px-1.5" style={{ fontSize: 9, fontWeight: 600, background: rule.startsWith("OR") ? "#FFF7ED" : "#EFF6FF", color: rule.startsWith("OR") ? "#C2410C" : "#1D4ED8" }}>
                        {rule.startsWith("OR") ? "OR" : "AND"}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "#64748B" }}>{rule.replace(/^OR: /, "")}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid #F1F5F9" }}>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{s.count.toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: "#64748B", marginLeft: 4 }}>contacts</span>
                </div>
                <div className="flex gap-1">
                  <button style={{ color: "#94A3B8" }} title="Refresh count" onClick={(e) => e.stopPropagation()}><RefreshCw size={12} /></button>
                  <button style={{ color: "#94A3B8" }} title="Duplicate" onClick={(e) => e.stopPropagation()}><Copy size={12} /></button>
                  <button style={{ color: "#94A3B8" }} title="Archive" onClick={(e) => e.stopPropagation()}><Archive size={12} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SegmentBuilder({ onBack }: { onBack: () => void }) {
  const [conditions, setConditions] = useState([
    { id: 1, facet: "Total Revenue", op: ">", value: "500", join: "AND" },
    { id: 2, facet: "Last Order Date", op: "within last", value: "30 days", join: "AND" },
  ]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [count] = useState(4210);

  const addCondition = () => {
    setConditions((prev) => [...prev, { id: Date.now(), facet: "Total Revenue", op: ">", value: "0", join: "AND" }]);
  };

  const removeCondition = (id: number) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="flex h-full" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5" style={{ height: 48, background: "#FFFFFF", borderBottom: "1px solid var(--border)" }}>
          <button onClick={onBack} style={{ fontSize: 12, color: "#2563EB" }}>← Segments</button>
          <span style={{ color: "#CBD5E1" }}>|</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>New Segment</span>
          <div className="flex-1" />
          <button style={{ fontSize: 12, color: "#64748B", padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 6 }}>Save as New</button>
          <button style={{ fontSize: 12, color: "#FFFFFF", background: "#2563EB", padding: "5px 14px", border: "none", borderRadius: 6, fontWeight: 500 }}>Save Segment</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Segment name */}
          <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 6 }}>Segment Name</label>
            <input
              placeholder="e.g. High-value recent buyers"
              style={{ width: "100%", fontSize: 14, fontWeight: 500, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, outline: "none", color: "#0F172A" }}
            />
          </div>

          {/* Rule builder */}
          <div className="rounded-xl p-5 space-y-3" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em" }}>CONDITIONS — contacts must match ALL of the following</p>

            {conditions.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                {i > 0 && (
                  <select
                    value={c.join}
                    onChange={(e) => setConditions((prev) => prev.map((x) => x.id === c.id ? { ...x, join: e.target.value } : x))}
                    style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, color: c.join === "OR" ? "#C2410C" : "#1D4ED8", background: c.join === "OR" ? "#FFF7ED" : "#EFF6FF", width: 56 }}
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                )}
                {i === 0 && <span style={{ width: 56, fontSize: 11, color: "#94A3B8", textAlign: "center", flexShrink: 0 }}>WHERE</span>}
                <select
                  value={c.facet}
                  onChange={(e) => setConditions((prev) => prev.map((x) => x.id === c.id ? { ...x, facet: e.target.value } : x))}
                  style={{ fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, color: "#0F172A", flex: 2, background: "#FFFFFF" }}
                >
                  {FACETS.map((f) => <option key={f}>{f}</option>)}
                </select>
                <select
                  value={c.op}
                  onChange={(e) => setConditions((prev) => prev.map((x) => x.id === c.id ? { ...x, op: e.target.value } : x))}
                  style={{ fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, color: "#0F172A", flex: 1, background: "#FFFFFF" }}
                >
                  {[">", "<", "=", ">=", "<=", "within last", "not within", "is", "is not"].map((o) => <option key={o}>{o}</option>)}
                </select>
                <input
                  value={c.value}
                  onChange={(e) => setConditions((prev) => prev.map((x) => x.id === c.id ? { ...x, value: e.target.value } : x))}
                  style={{ fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, flex: 1.5 }}
                />
                <button onClick={() => removeCondition(c.id)} style={{ color: "#94A3B8", flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            <button
              onClick={addCondition}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 mt-2"
              style={{ fontSize: 12, color: "#2563EB", border: "1px dashed #BFDBFE", background: "#EFF6FF" }}
            >
              <Plus size={12} /> Add Condition
            </button>
          </div>

          {/* Live count preview */}
          <div
            className="rounded-xl p-5 flex items-center justify-between"
            style={{ background: previewOpen ? "#FFFFFF" : "#F8FAFC", border: "1px solid var(--border)" }}
          >
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em" }}>LIVE COUNT PREVIEW</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span style={{ fontSize: 28, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{count.toLocaleString()}</span>
                <span style={{ fontSize: 13, color: "#64748B" }}>contacts match your rules</span>
              </div>
            </div>
            <button
              onClick={() => setPreviewOpen(!previewOpen)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2"
              style={{ fontSize: 12, fontWeight: 500, border: "1px solid var(--border)", color: "#0F172A", background: "#FFFFFF" }}
            >
              <Eye size={13} /> Preview Members
              {previewOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>

          {previewOpen && (
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div className="overflow-x-auto"><table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
                    {["Name / Email", "Lifetime Spend", "Last Order"].map((h) => (
                      <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", padding: "8px 14px" }}>
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {segmentMembers.map((m, i) => (
                    <tr key={m.email} style={{ borderBottom: i < segmentMembers.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-full flex items-center justify-center text-white"
                            style={{ width: 26, height: 26, background: `hsl(${m.email.charCodeAt(0) * 33}, 55%, 50%)`, fontSize: 10, fontWeight: 500 }}>
                            {m.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{m.name}</p>
                            <p style={{ fontSize: 11, color: "#64748B" }}>{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0F172A" }}>{m.spend}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>{m.lastOrder}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}