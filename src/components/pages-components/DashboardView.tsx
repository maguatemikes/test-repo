"use client";

import React, { useState } from "react";
import {
  Users, Mail, TrendingUp, MousePointerClick, DollarSign,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Circle, Zap
} from "lucide-react";

// ── Custom SVG multi-line chart (no recharts, avoids duplicate-key bug) ──────
type ChartRow = { date: string; sends: number; opens: number; clicks: number };

function MultiLineChart({ data }: { data: ChartRow[] }) {
  const W = 560;
  const H = 180;
  const padL = 42;
  const padR = 12;
  const padT = 10;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const allVals = data.flatMap((d) => [d.sends, d.opens, d.clicks]);
  const maxVal = Math.max(...allVals);
  const minVal = 0;

  const xStep = innerW / (data.length - 1);
  const scaleY = (v: number) => padT + innerH - ((v - minVal) / (maxVal - minVal)) * innerH;
  const scaleX = (i: number) => padL + i * xStep;

  const polyline = (key: keyof ChartRow) =>
    data.map((d, i) => `${scaleX(i)},${scaleY(d[key] as number)}`).join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(minVal + t * (maxVal - minVal)));

  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: ChartRow } | null>(null);

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
        {/* Y grid lines + labels */}
        {yTicks.map((tick, i) => {
          const cy = scaleY(tick);
          return (
            <g key={`ytick-${i}`}>
              <line x1={padL} x2={W - padR} y1={cy} y2={cy} stroke="#F1F5F9" strokeWidth={1} />
              <text x={padL - 5} y={cy + 3.5} textAnchor="end" fontSize={9} fill="#94A3B8">
                {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={`xlabel-${i}`} x={scaleX(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#94A3B8">
            {d.date}
          </text>
        ))}

        {/* Lines */}
        <polyline points={polyline("sends")} fill="none" stroke="#2563EB" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={polyline("opens")} fill="none" stroke="#10B981" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={polyline("clicks")} fill="none" stroke="#F59E0B" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Hover columns */}
        {data.map((d, i) => (
          <rect
            key={`hover-${i}`}
            x={scaleX(i) - xStep / 2}
            y={padT}
            width={xStep}
            height={innerH}
            fill="transparent"
            onMouseEnter={(e) => {
              const rect = (e.currentTarget.closest("svg") as SVGSVGElement).getBoundingClientRect();
              setTooltip({ x: scaleX(i), y: scaleY(d.sends), d });
            }}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: "crosshair" }}
          />
        ))}

        {/* Tooltip dot */}
        {tooltip && (
          <>
            <circle cx={tooltip.x} cy={scaleY(tooltip.d.sends)} r={3} fill="#2563EB" />
            <circle cx={tooltip.x} cy={scaleY(tooltip.d.opens)} r={3} fill="#10B981" />
            <circle cx={tooltip.x} cy={scaleY(tooltip.d.clicks)} r={3} fill="#F59E0B" />
            <line x1={tooltip.x} x2={tooltip.x} y1={padT} y2={H - padB} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="3 2" />
          </>
        )}
      </svg>

      {/* Floating tooltip box */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: `clamp(0px, ${(tooltip.x / W) * 100}%, calc(100% - 140px))`,
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 11,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            pointerEvents: "none",
            minWidth: 120,
          }}
        >
          <p style={{ fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{tooltip.d.date}</p>
          {([["#2563EB", "Sends", tooltip.d.sends], ["#10B981", "Opens", tooltip.d.opens], ["#F59E0B", "Clicks", tooltip.d.clicks]] as const).map(([color, label, val]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ color: "#64748B" }}>{label}:</span>
              <span style={{ color: "#0F172A", fontWeight: 500, fontFamily: "JetBrains Mono, monospace" }}>{val.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const kpis = [
  {
    label: "Total Contacts",
    value: "48,291",
    delta: "+1,204",
    up: true,
    sub: "this month",
    icon: Users,
    iconBg: "#EFF6FF",
    iconColor: "#2563EB",
  },
  {
    label: "Emails Sent",
    value: "214,550",
    delta: "+18.4%",
    up: true,
    sub: "vs last month",
    icon: Mail,
    iconBg: "#F0FDF4",
    iconColor: "#16A34A",
  },
  {
    label: "Avg Open Rate",
    value: "34.2%",
    delta: "-1.1%",
    up: false,
    sub: "industry avg 21.5%",
    icon: TrendingUp,
    iconBg: "#FFF7ED",
    iconColor: "#EA580C",
  },
  {
    label: "Avg Click Rate",
    value: "6.8%",
    delta: "+0.3%",
    up: true,
    sub: "industry avg 2.6%",
    icon: MousePointerClick,
    iconBg: "#F5F3FF",
    iconColor: "#7C3AED",
  },
  {
    label: "Revenue Attributed",
    value: "$82,410",
    delta: "+$12,300",
    up: true,
    sub: "last 30 days",
    icon: DollarSign,
    iconBg: "#FFF1F2",
    iconColor: "#E11D48",
  },
];

const chartData = [
  { date: "May 5", sends: 8200, opens: 2788, clicks: 558 },
  { date: "May 10", sends: 12400, opens: 4216, clicks: 843 },
  { date: "May 15", sends: 9800, opens: 3332, clicks: 666 },
  { date: "May 20", sends: 18600, opens: 6324, clicks: 1264 },
  { date: "May 25", sends: 14200, opens: 4828, clicks: 966 },
  { date: "May 31", sends: 21400, opens: 7278, clicks: 1455 },
  { date: "Jun 3", sends: 16800, opens: 5712, clicks: 1142 },
];

const recentCampaigns = [
  { name: "Summer Sale — VIP Segment", status: "sent", recipients: 4210, opens: "38.2%", clicks: "7.4%", sent: "Jun 3, 2026", revenue: "$14,800" },
  { name: "Win-back: 60-Day Inactive", status: "sent", recipients: 9830, opens: "22.1%", clicks: "3.9%", sent: "Jun 1, 2026", revenue: "$5,200" },
  { name: "June Newsletter", status: "scheduled", recipients: 48291, opens: "—", clicks: "—", sent: "Jun 6, 09:00", revenue: "—" },
  { name: "New Arrivals — Footwear", status: "draft", recipients: 0, opens: "—", clicks: "—", sent: "Draft", revenue: "—" },
  { name: "Abandoned Cart — Reminder 2", status: "sent", recipients: 1248, opens: "41.6%", clicks: "12.1%", sent: "May 31, 2026", revenue: "$9,100" },
];

const activeAutomations = [
  { name: "Welcome Series", trigger: "Sign up", enrolled: 348, completed: 214, rate: "61.5%", status: "active" },
  { name: "Abandoned Cart Recovery", trigger: "Added to cart", enrolled: 1842, completed: 407, rate: "22.1%", status: "active" },
  { name: "Win-back Flow", trigger: "60 days inactive", enrolled: 5210, completed: 1843, rate: "35.4%", status: "active" },
  { name: "Post-Purchase Upsell", trigger: "Order complete", enrolled: 2890, completed: 1122, rate: "38.8%", status: "paused" },
];

const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
  sent: { bg: "#F0FDF4", color: "#16A34A", label: "Sent" },
  scheduled: { bg: "#EFF6FF", color: "#2563EB", label: "Scheduled" },
  draft: { bg: "#F8FAFC", color: "#64748B", label: "Draft" },
  active: { bg: "#F0FDF4", color: "#16A34A", label: "Active" },
  paused: { bg: "#FFF7ED", color: "#EA580C", label: "Paused" },
};

const kpiNav: Record<string, string> = {
  "Total Contacts": "customers",
  "Emails Sent": "analytics",
  "Avg Open Rate": "analytics",
  "Avg Click Rate": "analytics",
  "Revenue Attributed": "analytics",
};

interface DashboardViewProps { onNavigate: (s: any) => void; }

export function DashboardView({ onNavigate }: DashboardViewProps) {
  return (
    <div className="p-4 md:p-6 space-y-6" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              onClick={() => onNavigate(kpiNav[k.label] || "analytics")}
              className="rounded-lg p-4 cursor-pointer"
              style={{ background: "#FFFFFF", border: "1px solid var(--border)", transition: "border-color 0.15s, box-shadow 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#2563EB"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px #EFF6FF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(15,23,42,0.08)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="rounded p-1.5"
                  style={{ background: k.iconBg }}
                >
                  <Icon size={14} color={k.iconColor} />
                </div>
                <span
                  className="flex items-center gap-0.5"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: k.up ? "#16A34A" : "#DC2626",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {k.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {k.delta}
                </span>
              </div>
              <p style={{ fontSize: 22, fontWeight: 600, color: "#0F172A", lineHeight: 1.2 }}>{k.value}</p>
              <p style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>{k.label}</p>
              <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Chart + Active automations */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_340px]">
        {/* Email performance chart */}
        <div
          className="rounded-lg p-5"
          style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Email Performance</h3>
              <p style={{ fontSize: 11, color: "#64748B" }}>Sends, opens & clicks — last 30 days</p>
            </div>
            <select
              style={{
                fontSize: 11,
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "4px 8px",
                color: "#64748B",
                background: "#F8FAFC",
              }}
            >
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <MultiLineChart data={chartData} />
          <div className="flex gap-4 mt-3">
            {[["#2563EB", "Sends"], ["#10B981", "Opens"], ["#F59E0B", "Clicks"]].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="rounded-full" style={{ width: 8, height: 8, background: color, display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#64748B" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active automations */}
        <div
          className="rounded-lg p-5"
          style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Active Automations</h3>
            <span onClick={() => onNavigate("automations")} style={{ fontSize: 11, color: "#2563EB", cursor: "pointer" }}>View all →</span>
          </div>
          <div className="space-y-3">
            {activeAutomations.map((a) => {
              const s = statusStyles[a.status];
              return (
                <div key={a.name} onClick={() => onNavigate("automations")} className="flex flex-col gap-1.5 pb-3 cursor-pointer" style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={12} color={s.color} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{a.name}</span>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{ fontSize: 10, fontWeight: 500, background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 11, color: "#64748B" }}>Trigger: {a.trigger}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span style={{ fontSize: 11, color: "#64748B" }}>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#0F172A" }}>{a.enrolled.toLocaleString()}</span> enrolled
                    </span>
                    <span style={{ fontSize: 11, color: "#64748B" }}>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#16A34A" }}>{a.rate}</span> conversion
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="rounded-full overflow-hidden" style={{ height: 3, background: "#F1F5F9" }}>
                    <div
                      className="rounded-full"
                      style={{
                        height: "100%",
                        width: a.rate,
                        background: a.status === "paused" ? "#F59E0B" : "#2563EB",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Campaigns table */}
      <div
        className="rounded-lg"
        style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Recent Campaigns</h3>
          <button onClick={() => onNavigate("campaigns")} style={{ fontSize: 11, color: "#2563EB", cursor: "pointer" }}>View all campaigns →</button>
        </div>
        <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {["Campaign", "Status", "Recipients", "Open Rate", "Click Rate", "Revenue", "Sent"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#64748B",
                    letterSpacing: "0.04em",
                    padding: "8px 16px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentCampaigns.map((c, i) => {
              const s = statusStyles[c.status];
              return (
                <tr
                  key={i}
                  className="cursor-pointer"
                  onClick={() => onNavigate("campaigns")}
                  style={{ borderBottom: i < recentCampaigns.length - 1 ? "1px solid #F8FAFC" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{c.name}</span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{ fontSize: 10, fontWeight: 500, background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0F172A" }}>
                    {c.recipients > 0 ? c.recipients.toLocaleString() : "—"}
                  </td>
                  <td style={{ padding: "10px 16px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: c.opens !== "—" ? "#16A34A" : "#94A3B8" }}>
                    {c.opens}
                  </td>
                  <td style={{ padding: "10px 16px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: c.clicks !== "—" ? "#2563EB" : "#94A3B8" }}>
                    {c.clicks}
                  </td>
                  <td style={{ padding: "10px 16px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0F172A" }}>
                    {c.revenue}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: "#64748B" }}>{c.sent}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}