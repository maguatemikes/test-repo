"use client";

import { Filter, Plus, ChevronLeft, RefreshCw, Copy, Archive, MoreHorizontal, Search, Eye, Play, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

type SegRow = { id: string; name: string; rules: string[]; count: number; status: string };
type Member = { name: string; email: string; spend: string; lastOrder: string };

const SkBar = ({ w, h = 12, r = 6 }: { w: number; h?: number; r?: number }) => (
  <div className="animate-pulse" style={{ width: w, height: h, borderRadius: r, background: "#E2E8F0", flexShrink: 0 }} />
);
function SkeletonSegCard() {
  return (
    <div className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3"><SkBar w={32} h={32} r={8} /><SkBar w={54} h={18} r={999} /></div>
      <SkBar w={140} h={13} />
      <div className="mt-2 mb-4 flex flex-col gap-1.5"><SkBar w={120} h={9} /><SkBar w={90} h={9} /></div>
      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid #F1F5F9" }}><SkBar w={48} h={16} /><SkBar w={60} h={11} /></div>
    </div>
  );
}

const statusConfig: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  ready: { bg: "#F0FDF4", color: "#15803D", dot: "#22C55E", label: "Ready" },
  stale: { bg: "#FFF7ED", color: "#C2410C", dot: "#F97316", label: "Stale" },
  computing: { bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6", label: "Computing…" },
};

// ---------- rule-tree model (UI side) ----------
const FACETS = ["Total Revenue", "Customer LTV", "Total Orders", "Last Order Date", "Created Date", "Source", "Last Engagement"];
const OPS = [">", "<", "=", ">=", "<=", "within last", "not within", "is", "is not"];

const FACET_FIELD: Record<string, string> = {
  "Total Revenue": "lifetime_spend", "Customer LTV": "lifetime_spend", "Total Orders": "order_count",
  "Last Order Date": "last_order_at", "Created Date": "created_at", "Source": "source", "Last Engagement": "last_engagement_at",
};
const OP_MAP: Record<string, string> = {
  ">": "gt", "<": "lt", "=": "eq", ">=": "gte", "<=": "lte",
  "within last": "within_days", "not within": "older_than_days", "is": "eq", "is not": "ne",
};
const FIELD_FACET: Record<string, string> = {
  lifetime_spend: "Total Revenue", order_count: "Total Orders", last_order_at: "Last Order Date",
  created_at: "Created Date", source: "Source", last_engagement_at: "Last Engagement",
};
const OPCODE_SYMBOL: Record<string, string> = {
  gt: ">", lt: "<", eq: "=", gte: ">=", lte: "<=", within_days: "within last", older_than_days: "not within", ne: "is not",
};

type CondNode = { id: number; kind: "cond"; facet: string; op: string; value: string };
type GroupNode = { id: number; kind: "group"; op: "AND" | "OR"; children: TreeNode[] };
type TreeNode = CondNode | GroupNode;

let _uid = 1;
const uid = () => _uid++;
const newCond = (): CondNode => ({ id: uid(), kind: "cond", facet: "Total Revenue", op: ">", value: "500" });
const newGroup = (): GroupNode => ({ id: uid(), kind: "group", op: "AND", children: [newCond()] });

type ApiRule = { field: string; op: string; value: string | number };
type ApiGroup = { op: "AND" | "OR"; rules: (ApiRule | ApiGroup)[] };

/** UI tree → API rule_definition. */
function treeToRule(node: TreeNode): ApiGroup | ApiRule | null {
  if (node.kind === "group") {
    return { op: node.op, rules: node.children.map(treeToRule).filter(Boolean) as (ApiRule | ApiGroup)[] };
  }
  const field = FACET_FIELD[node.facet];
  const op = OP_MAP[node.op];
  if (!field || !op) return null;
  let value: string | number;
  if (op === "within_days" || op === "older_than_days") value = parseInt(String(node.value), 10) || 0;
  else if (field === "source") value = String(node.value).trim();
  else { const n = Number(node.value); value = Number.isNaN(n) ? String(node.value) : n; }
  return { field, op, value };
}

/** API rule_definition → UI tree (for editing). */
function ruleToTree(rule: ApiGroup | ApiRule): TreeNode {
  if (rule && "rules" in rule && Array.isArray(rule.rules)) {
    return { id: uid(), kind: "group", op: rule.op === "OR" ? "OR" : "AND", children: rule.rules.map(ruleToTree) };
  }
  const r = rule as ApiRule;
  return {
    id: uid(), kind: "cond",
    facet: FIELD_FACET[r.field] || FACETS[0],
    op: OPCODE_SYMBOL[r.op] || ">",
    value: String(r.value ?? ""),
  };
}

const selStyle = (flex: number): React.CSSProperties => ({ fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, color: "#0F172A", flex, background: "#FFFFFF" });

// ---------- recursive editors ----------
function ConditionRow({ node, onChange, onRemove }: { node: CondNode; onChange: (n: CondNode) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <select value={node.facet} onChange={(e) => onChange({ ...node, facet: e.target.value })} style={selStyle(2)}>
        {FACETS.map((f) => <option key={f}>{f}</option>)}
      </select>
      <select value={node.op} onChange={(e) => onChange({ ...node, op: e.target.value })} style={selStyle(1)}>
        {OPS.map((o) => <option key={o}>{o}</option>)}
      </select>
      <input value={node.value} onChange={(e) => onChange({ ...node, value: e.target.value })}
        style={{ fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, flex: 1.5 }} />
      <button onClick={onRemove} title="Remove condition" style={{ color: "#94A3B8", flexShrink: 0, cursor: "pointer" }}><Trash2 size={13} /></button>
    </div>
  );
}

function RuleGroupEditor({ node, onChange, onRemove, isRoot }: { node: GroupNode; onChange: (n: GroupNode) => void; onRemove?: () => void; isRoot?: boolean }) {
  const updateChild = (i: number, child: TreeNode) => onChange({ ...node, children: node.children.map((c, idx) => (idx === i ? child : c)) });
  const removeChild = (i: number) => onChange({ ...node, children: node.children.filter((_, idx) => idx !== i) });
  const addCond = () => onChange({ ...node, children: [...node.children, newCond()] });
  const addGroup = () => onChange({ ...node, children: [...node.children, newGroup()] });

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, background: isRoot ? "#FFFFFF" : "#F8FAFC" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center" style={{ background: "#EFF6FF", borderRadius: 6, padding: 2 }}>
            {(["AND", "OR"] as const).map((op) => (
              <button key={op} onClick={() => onChange({ ...node, op })}
                style={{ fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 4, border: "none", cursor: "pointer",
                  background: node.op === op ? (op === "OR" ? "#C2410C" : "#2563EB") : "transparent",
                  color: node.op === op ? "#FFFFFF" : "#64748B" }}>{op}</button>
            ))}
          </div>
          <span style={{ fontSize: 10, color: "#94A3B8" }}>match {node.op === "OR" ? "any" : "all"} of:</span>
        </div>
        {!isRoot && onRemove && <button onClick={onRemove} title="Remove group" style={{ color: "#94A3B8", cursor: "pointer" }}><Trash2 size={13} /></button>}
      </div>

      <div className="space-y-2" style={{ paddingLeft: isRoot ? 0 : 10, borderLeft: isRoot ? "none" : "2px solid #E2E8F0" }}>
        {node.children.map((child, i) => (
          <div key={child.id}>
            {child.kind === "group"
              ? <RuleGroupEditor node={child} onChange={(c) => updateChild(i, c)} onRemove={() => removeChild(i)} />
              : <ConditionRow node={child} onChange={(c) => updateChild(i, c)} onRemove={() => removeChild(i)} />}
          </div>
        ))}
        {node.children.length === 0 && <p style={{ fontSize: 11, color: "#94A3B8" }}>Empty group — add a condition.</p>}
      </div>

      <div className="flex gap-2 mt-2">
        <button onClick={addCond} className="flex items-center gap-1 rounded-lg px-3 py-1.5"
          style={{ fontSize: 11, color: "#2563EB", border: "1px dashed #BFDBFE", background: "#EFF6FF", cursor: "pointer" }}>
          <Plus size={11} /> Condition
        </button>
        <button onClick={addGroup} className="flex items-center gap-1 rounded-lg px-3 py-1.5"
          style={{ fontSize: 11, color: "#7C3AED", border: "1px dashed #DDD6FE", background: "#F5F3FF", cursor: "pointer" }}>
          <Plus size={11} /> Group
        </button>
      </div>
    </div>
  );
}

// ---------- main view ----------
export function SegmentsView() {
  const [openSegment, setOpenSegment] = useState<string | null>(null);
  const [builder, setBuilder] = useState<null | { initial?: { id: string; name: string; tree: TreeNode } }>(null);
  const [query, setQuery] = useState("");
  const [segments, setSegments] = useState<SegRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const loadSegments = () => {
    setLoading(true);
    fetch("/api/segments").then((r) => r.json()).then((d) => setSegments(d.segments || [])).catch(() => {}).finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadSegments(); }, []);

  useEffect(() => {
    if (!openSegment) return;
    let active = true;
    setMembersLoading(true);
    setMembers([]);
    fetch(`/api/segments?preview=${encodeURIComponent(openSegment)}`)
      .then((r) => r.json()).then((d) => { if (active) setMembers(d.members || []); })
      .catch(() => {}).finally(() => { if (active) setMembersLoading(false); });
    return () => { active = false; };
  }, [openSegment]);

  const openEdit = async (id: string) => {
    const d = await fetch(`/api/segments?edit=${encodeURIComponent(id)}`).then((r) => r.json()).catch(() => null);
    if (d?.ok) {
      setOpenSegment(null);
      setBuilder({ initial: { id: d.segment.id, name: d.segment.name, tree: ruleToTree(d.segment.rule) } });
    } else alert("Could not load segment for editing");
  };

  const selectedSegment = segments.find((s) => s.id === openSegment);

  if (builder) {
    return <SegmentBuilder initial={builder.initial} onBack={() => setBuilder(null)} onSaved={() => { setBuilder(null); loadSegments(); }} />;
  }

  // ---------- detail ----------
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
            <button onClick={() => openEdit(selectedSegment.id)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ fontSize: 12, border: "1px solid var(--border)", color: "#64748B", background: "#FFFFFF", cursor: "pointer" }}>
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

        <div className="rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "#F8FAFC" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>Member Preview</span>
            <span style={{ fontSize: 11, color: "#64748B" }}>First 20 shown</span>
          </div>
          <div className="overflow-x-auto"><table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
                {["Name / Email", "Lifetime Spend", "Last Order"].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", padding: "8px 14px" }}>{h.toUpperCase()}</th>
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
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
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

  // ---------- list ----------
  const filtered = segments.filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="p-6 space-y-4" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, color: "#64748B" }}>
          {loading ? "Loading segments…" : <><strong style={{ fontWeight: 600, color: "#0F172A" }}>{segments.length}</strong> dynamic segments · evaluated live</>}
        </p>
        <button onClick={() => setBuilder({})} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
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

      {loading ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonSegCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Filter}
          title={query ? "No segments match your search" : "No segments yet"}
          description={query ? "Try a different search term." : "Build a dynamic audience with rules — e.g. “Lifetime spend ≥ $1,000 and last order within 30 days.” It updates automatically as customers qualify."}
          action={!query ? (
            <button onClick={() => setBuilder({})} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
              <Plus size={13} /> New Segment
            </button>
          ) : undefined}
        />
      ) : (
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {filtered.map((s) => {
          const sc = statusConfig[s.status] || statusConfig.ready;
          return (
            <div key={s.id} className="rounded-xl p-4 cursor-pointer" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
              onClick={() => setOpenSegment(s.id)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(15,23,42,0.08)")}>
              <div className="flex items-start justify-between mb-3">
                <div className="rounded-lg flex items-center justify-center" style={{ width: 32, height: 32, background: "#EFF6FF" }}>
                  <Filter size={14} color="#2563EB" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.color }}>
                    <span className="rounded-full" style={{ width: 5, height: 5, background: sc.dot, display: "inline-block" }} />
                    {sc.label}
                  </span>
                  <button title="Edit" style={{ color: "#94A3B8" }} onClick={(e) => { e.stopPropagation(); openEdit(s.id); }}><MoreHorizontal size={13} /></button>
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
                  <button style={{ color: "#94A3B8" }} title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(s.id); }}><Eye size={12} /></button>
                  <button style={{ color: "#94A3B8" }} title="Duplicate" onClick={(e) => e.stopPropagation()}><Copy size={12} /></button>
                  <button style={{ color: "#94A3B8" }} title="Archive" onClick={(e) => e.stopPropagation()}><Archive size={12} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

// ---------- builder (create + edit) ----------
function SegmentBuilder({ onBack, onSaved, initial }: { onBack: () => void; onSaved: () => void; initial?: { id: string; name: string; tree: TreeNode } }) {
  const [name, setName] = useState(initial?.name || "");
  const [tree, setTree] = useState<GroupNode>(() => {
    const t = initial?.tree;
    return t && t.kind === "group" ? t : newGroup();
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const editId = initial?.id;

  // Live preview whenever the tree changes (debounced).
  useEffect(() => {
    const rule = treeToRule(tree) as ApiGroup;
    if (!rule.rules || rule.rules.length === 0) { setCount(0); setMembers([]); return; }
    setPreviewing(true);
    const t = setTimeout(() => {
      fetch("/api/segments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rule }) })
        .then((r) => r.json()).then((d) => { setCount(d.count ?? 0); setMembers(d.members || []); })
        .catch(() => {}).finally(() => setPreviewing(false));
    }, 400);
    return () => clearTimeout(t);
  }, [tree]);

  const save = async () => {
    const rule = treeToRule(tree) as ApiGroup;
    if (!name.trim() || !rule.rules.length || saving) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name, rule, save: true };
      if (editId) body.id = editId;
      const res = await fetch("/api/segments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (d.ok) onSaved(); else alert(d.error || "Failed to save segment");
    } finally { setSaving(false); }
  };

  return (
    <div className="flex h-full" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5" style={{ height: 48, background: "#FFFFFF", borderBottom: "1px solid var(--border)" }}>
          <button onClick={onBack} style={{ fontSize: 12, color: "#2563EB" }}>← Segments</button>
          <span style={{ color: "#CBD5E1" }}>|</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{editId ? "Edit Segment" : "New Segment"}</span>
          <div className="flex-1" />
          <button onClick={save} disabled={saving || !name.trim()} style={{ fontSize: 12, color: "#FFFFFF", background: saving || !name.trim() ? "#94A3B8" : "#2563EB", padding: "5px 14px", border: "none", borderRadius: 6, fontWeight: 500, cursor: saving || !name.trim() ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : editId ? "Update Segment" : "Save Segment"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 6 }}>Segment Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. High-value recent buyers"
              style={{ width: "100%", fontSize: 14, fontWeight: 500, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, outline: "none", color: "#0F172A" }} />
          </div>

          <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 12 }}>CONDITIONS — nest AND / OR groups as needed</p>
            <RuleGroupEditor node={tree} onChange={setTree} isRoot />
          </div>

          <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: previewOpen ? "#FFFFFF" : "#F8FAFC", border: "1px solid var(--border)" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em" }}>LIVE COUNT PREVIEW</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span style={{ fontSize: 28, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{previewing ? "…" : (count ?? 0).toLocaleString()}</span>
                <span style={{ fontSize: 13, color: "#64748B" }}>contacts match your rules</span>
              </div>
            </div>
            <button onClick={() => setPreviewOpen(!previewOpen)} className="flex items-center gap-1.5 rounded-lg px-4 py-2" style={{ fontSize: 12, fontWeight: 500, border: "1px solid var(--border)", color: "#0F172A", background: "#FFFFFF" }}>
              <Eye size={13} /> Preview Members {previewOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>

          {previewOpen && (
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div className="overflow-x-auto"><table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
                    {["Name / Email", "Lifetime Spend", "Last Order"].map((h) => (
                      <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", padding: "8px 14px" }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "#94A3B8" }}>No matching members</td></tr>
                  ) : members.map((m, i) => (
                    <tr key={m.email} style={{ borderBottom: i < members.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-full flex items-center justify-center text-white" style={{ width: 26, height: 26, background: `hsl(${m.email.charCodeAt(0) * 33}, 55%, 50%)`, fontSize: 10, fontWeight: 500 }}>
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
