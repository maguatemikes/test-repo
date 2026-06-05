"use client";

import { Zap, Plus, Play, Pause, Copy, MoreHorizontal, ArrowRight, Clock, GitBranch, Mail, Tag } from "lucide-react";
import { useState } from "react";

const automations = [
  { id: 1, name: "Welcome Series", trigger: "Contact signs up", status: "active", enrolled: 348, completed: 214, conversions: "61.5%", steps: 5, lastModified: "May 28, 2026", revenue: "$4,200" },
  { id: 2, name: "Abandoned Cart Recovery", trigger: "Added to cart, no purchase 2h", status: "active", enrolled: 1842, completed: 407, conversions: "22.1%", steps: 4, lastModified: "Jun 1, 2026", revenue: "$18,700" },
  { id: 3, name: "Win-back Flow", trigger: "60 days inactive", status: "active", enrolled: 5210, completed: 1843, conversions: "35.4%", steps: 3, lastModified: "Apr 14, 2026", revenue: "$9,800" },
  { id: 4, name: "Post-Purchase Upsell", trigger: "Order placed", status: "paused", enrolled: 2890, completed: 1122, conversions: "38.8%", steps: 6, lastModified: "May 3, 2026", revenue: "$22,100" },
  { id: 5, name: "VIP Loyalty Reward", trigger: "LTV exceeds $2,000", status: "active", enrolled: 142, completed: 98, conversions: "69.0%", steps: 2, lastModified: "Jun 2, 2026", revenue: "$3,400" },
  { id: 6, name: "Birthday Offer", trigger: "Contact birthday", status: "draft", enrolled: 0, completed: 0, conversions: "—", steps: 2, lastModified: "Jun 3, 2026", revenue: "—" },
];

const statusConfig: Record<string, { bg: string; color: string; dot: string }> = {
  active: { bg: "#F0FDF4", color: "#15803D", dot: "#22C55E" },
  paused: { bg: "#FFF7ED", color: "#C2410C", dot: "#F97316" },
  draft: { bg: "#F8FAFC", color: "#475569", dot: "#94A3B8" },
};

const nodeTypes = [
  { icon: Zap, label: "Trigger", color: "#7C3AED", bg: "#F5F3FF" },
  { icon: Clock, label: "Wait 2h", color: "#0EA5E9", bg: "#F0F9FF" },
  { icon: GitBranch, label: "Condition", color: "#F59E0B", bg: "#FFFBEB" },
  { icon: Mail, label: "Send Email", color: "#2563EB", bg: "#EFF6FF" },
  { icon: Clock, label: "Wait 24h", color: "#0EA5E9", bg: "#F0F9FF" },
  { icon: Mail, label: "Send Email", color: "#2563EB", bg: "#EFF6FF" },
];

export function AutomationsView() {
  const [showFlow, setShowFlow] = useState(false);

  if (showFlow) {
    return <FlowCanvas onBack={() => setShowFlow(false)} />;
  }

  return (
    <div className="p-6 space-y-4" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 12, color: "#64748B" }}>
            <strong style={{ color: "#0F172A" }}>6</strong> automations · <strong style={{ color: "#16A34A" }}>4</strong> active
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-2"
            style={{ fontSize: 12, fontWeight: 500, background: "#F1F5F9", color: "#64748B", border: "1px solid var(--border)" }}
          >
            Browse Templates
          </button>
          <button
            onClick={() => setShowFlow(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2"
            style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF" }}
          >
            <Plus size={13} />
            New Automation
          </button>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {automations.map((a) => {
          const sc = statusConfig[a.status];
          return (
            <div
              key={a.id}
              className="rounded-xl p-4 cursor-pointer"
              style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
              onClick={() => setShowFlow(true)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(15,23,42,0.08)")}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="rounded-lg flex items-center justify-center"
                  style={{ width: 36, height: 36, background: sc.bg }}
                >
                  <Zap size={16} color={sc.color} />
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
                    style={{ fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color }}
                  >
                    <span className="rounded-full" style={{ width: 5, height: 5, background: sc.dot, display: "inline-block" }} />
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </span>
                  <button style={{ color: "#94A3B8" }}><MoreHorizontal size={14} /></button>
                </div>
              </div>

              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 3 }}>{a.name}</h3>
              <p style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>Trigger: {a.trigger}</p>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Enrolled", value: a.enrolled.toLocaleString() },
                  { label: "Completed", value: a.completed.toLocaleString() },
                  { label: "Conversion", value: a.conversions },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg p-2.5" style={{ background: "#F8FAFC" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{m.value}</p>
                    <p style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{m.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>{a.steps} steps · rev {a.revenue}</span>
                <div className="flex gap-1">
                  {a.status === "active"
                    ? <button style={{ color: "#94A3B8" }} title="Pause"><Pause size={13} /></button>
                    : <button style={{ color: "#94A3B8" }} title="Activate"><Play size={13} /></button>
                  }
                  <button style={{ color: "#94A3B8" }} title="Duplicate"><Copy size={13} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowCanvas({ onBack }: { onBack: () => void }) {
  const [selectedNode, setSelectedNode] = useState<number | null>(1);

  return (
    <div className="flex h-full" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      {/* Canvas */}
      <div className="flex-1 relative" style={{ background: "#F8FAFC" }}>
        {/* Toolbar */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ height: 48, background: "#FFFFFF", borderBottom: "1px solid var(--border)" }}
        >
          <button onClick={onBack} style={{ fontSize: 12, color: "#2563EB" }}>← Automations</button>
          <span style={{ color: "#CBD5E1" }}>|</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Abandoned Cart Recovery</span>
          <span
            className="rounded-full px-2 py-0.5"
            style={{ fontSize: 10, background: "#F0FDF4", color: "#15803D", fontWeight: 600 }}
          >
            Active
          </span>
          <div className="flex-1" />
          <button style={{ fontSize: 12, color: "#64748B", padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 6 }}>
            Pause
          </button>
          <button style={{ fontSize: 12, color: "#FFFFFF", background: "#2563EB", padding: "5px 12px", border: "none", borderRadius: 6 }}>
            Save Changes
          </button>
        </div>

        {/* Flow diagram */}
        <div className="flex flex-col items-center pt-10 gap-0">
          {nodeTypes.map((node, idx) => {
            const Icon = node.icon;
            const isSelected = selectedNode === idx;
            return (
              <div key={idx} className="flex flex-col items-center">
                <button
                  onClick={() => setSelectedNode(idx)}
                  className="flex items-center gap-3 rounded-xl px-5 py-3.5 transition-all"
                  style={{
                    background: "#FFFFFF",
                    border: `2px solid ${isSelected ? node.color : "var(--border)"}`,
                    minWidth: 220,
                    boxShadow: isSelected ? `0 0 0 4px ${node.bg}` : "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    className="rounded-lg flex items-center justify-center"
                    style={{ width: 30, height: 30, background: node.bg }}
                  >
                    <Icon size={14} color={node.color} />
                  </div>
                  <div className="text-left">
                    <p style={{ fontSize: 11, color: "#64748B" }}>{idx === 0 ? "TRIGGER" : idx === 2 ? "CONDITION" : idx % 2 === 1 ? "WAIT" : "ACTION"}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{node.label}</p>
                  </div>
                  {idx === 2 && (
                    <span className="ml-auto rounded-full px-2 py-0.5" style={{ fontSize: 10, background: "#FFF7ED", color: "#C2410C" }}>
                      Split
                    </span>
                  )}
                </button>
                {idx < nodeTypes.length - 1 && (
                  <div className="flex flex-col items-center" style={{ height: 28 }}>
                    <div style={{ width: 1, flex: 1, background: "#CBD5E1" }} />
                    <ArrowRight size={10} color="#94A3B8" style={{ transform: "rotate(90deg)" }} />
                  </div>
                )}
              </div>
            );
          })}
          <button
            className="flex items-center gap-1.5 mt-4 rounded-lg px-4 py-2"
            style={{ fontSize: 12, color: "#2563EB", border: "1px dashed #BFDBFE", background: "#EFF6FF" }}
          >
            <Plus size={13} />
            Add Step
          </button>
        </div>
      </div>

      {/* Config panel */}
      <div
        className="p-5 overflow-y-auto"
        style={{ width: 280, background: "#FFFFFF", borderLeft: "1px solid var(--border)" }}
      >
        {selectedNode !== null && (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 12 }}>
              {selectedNode === 0 ? "TRIGGER SETTINGS" : "NODE SETTINGS"}
            </p>
            {selectedNode === 0 && (
              <div className="space-y-4">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 5 }}>Trigger event</label>
                  <select style={{ width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, color: "#0F172A" }}>
                    <option>Added to cart</option>
                    <option>Purchase completed</option>
                    <option>Sign up</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 5 }}>Wait before starting</label>
                  <input type="number" defaultValue={2} style={{ width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }} />
                  <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>Hours after trigger fires</p>
                </div>
              </div>
            )}
            {selectedNode === 1 && (
              <div className="space-y-4">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 5 }}>Wait duration</label>
                  <div className="flex gap-2">
                    <input type="number" defaultValue={2} style={{ flex: 1, fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }} />
                    <select style={{ fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }}>
                      <option>Hours</option>
                      <option>Days</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            {selectedNode === 3 || selectedNode === 5 ? (
              <div className="space-y-4">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 5 }}>Email template</label>
                  <select style={{ width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }}>
                    <option>Abandoned Cart Reminder</option>
                    <option>Cart Discount Code</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 5 }}>From name</label>
                  <input defaultValue="Acme Corp" style={{ width: "100%", fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }} />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}