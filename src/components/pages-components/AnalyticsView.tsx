"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

// ── Shared SVG chart helpers ──────────────────────────────────────────────────
const PAD = { l: 44, r: 12, t: 10, b: 28 };

function yTicks(min: number, max: number, count = 5) {
  return Array.from({ length: count }, (_, i) => min + (i / (count - 1)) * (max - min));
}

function scaleX(i: number, n: number, w: number) {
  return PAD.l + (i / (n - 1)) * (w - PAD.l - PAD.r);
}
function scaleY(v: number, min: number, max: number, h: number) {
  return PAD.t + (h - PAD.t - PAD.b) - ((v - min) / (max - min)) * (h - PAD.t - PAD.b);
}

function fmtY(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(Math.round(v));
}

// ── Grouped Bar Chart ─────────────────────────────────────────────────────────
type BarSeries = { key: string; label: string; color: string };

function SvgBarChart({ data, series, xKey, height = 220 }: {
  data: Record<string, any>[];
  series: BarSeries[];
  xKey: string;
  height?: number;
}) {
  const W = 560;
  const H = height;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const allVals = data.flatMap((d) => series.map((s) => d[s.key] as number));
  const maxVal = Math.max(...allVals);

  const slotW = innerW / data.length;
  const barW = Math.max(4, (slotW / series.length) * 0.65);
  const groupGap = (slotW - barW * series.length) / 2;

  const ticks = yTicks(0, maxVal);
  const [tooltip, setTooltip] = useState<{ i: number } | null>(null);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
        {ticks.map((t, i) => {
          const cy = scaleY(t, 0, maxVal, H);
          return (
            <g key={`yt-${i}`}>
              <line x1={PAD.l} x2={W - PAD.r} y1={cy} y2={cy} stroke="#F1F5F9" strokeWidth={1} />
              <text x={PAD.l - 5} y={cy + 3.5} textAnchor="end" fontSize={9} fill="#94A3B8">{fmtY(t)}</text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const slotX = PAD.l + i * slotW;
          return (
            <g key={`bar-${i}`}>
              {series.map((s, si) => {
                const val = d[s.key] as number;
                const bx = slotX + groupGap + si * barW;
                const by = scaleY(val, 0, maxVal, H);
                const bh = H - PAD.b - by;
                return (
                  <rect
                    key={s.key}
                    x={bx} y={by} width={barW} height={bh}
                    fill={tooltip?.i === i ? s.color : s.color}
                    opacity={tooltip && tooltip.i !== i ? 0.5 : 1}
                    rx={2}
                  />
                );
              })}
              <text x={slotX + slotW / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="#94A3B8">
                {d[xKey]}
              </text>
              <rect
                x={slotX} y={PAD.t} width={slotW} height={innerH}
                fill="transparent"
                onMouseEnter={() => setTooltip({ i })}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: "crosshair" }}
              />
            </g>
          );
        })}
      </svg>

      {tooltip !== null && (() => {
        const d = data[tooltip.i];
        const pct = (PAD.l + tooltip.i * slotW + slotW / 2) / W * 100;
        return (
          <div style={{
            position: "absolute", top: 8, pointerEvents: "none",
            left: `clamp(0px, ${pct}%, calc(100% - 130px))`,
            background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 6,
            padding: "7px 10px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", minWidth: 120,
          }}>
            <p style={{ fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{d[xKey]}</p>
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
                <span style={{ color: "#64748B" }}>{s.label}:</span>
                <span style={{ color: "#0F172A", fontWeight: 500, fontFamily: "JetBrains Mono, monospace" }}>
                  {(d[s.key] as number).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ── Multi-line Chart ──────────────────────────────────────────────────────────
type LineSeries = { key: string; label: string; color: string };

function SvgLineChart({ data, series, xKey, height = 240 }: {
  data: Record<string, any>[];
  series: LineSeries[];
  xKey: string;
  height?: number;
}) {
  const W = 480;
  const H = height;
  const innerH = H - PAD.t - PAD.b;

  const allVals = data.flatMap((d) => series.map((s) => d[s.key] as number));
  const maxVal = Math.max(...allVals);
  const minVal = 0;

  const sx = (i: number) => scaleX(i, data.length, W);
  const sy = (v: number) => scaleY(v, minVal, maxVal, H);

  const ticks = yTicks(minVal, maxVal);
  const [tooltip, setTooltip] = useState<{ i: number } | null>(null);
  const xStep = (W - PAD.l - PAD.r) / (data.length - 1);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
        {ticks.map((t, i) => {
          const cy = sy(t);
          return (
            <g key={`yt-${i}`}>
              <line x1={PAD.l} x2={W - PAD.r} y1={cy} y2={cy} stroke="#F1F5F9" strokeWidth={1} />
              <text x={PAD.l - 5} y={cy + 3.5} textAnchor="end" fontSize={9} fill="#94A3B8">{fmtY(t)}</text>
            </g>
          );
        })}

        {data.map((d, i) => (
          <text key={`xl-${i}`} x={sx(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#94A3B8">
            {d[xKey]}
          </text>
        ))}

        {series.map((s) => (
          <polyline
            key={s.key}
            points={data.map((d, i) => `${sx(i)},${sy(d[s.key] as number)}`).join(" ")}
            fill="none" stroke={s.color} strokeWidth={2}
            strokeLinejoin="round" strokeLinecap="round"
          />
        ))}

        {tooltip !== null && (
          <line
            x1={sx(tooltip.i)} x2={sx(tooltip.i)}
            y1={PAD.t} y2={H - PAD.b}
            stroke="#E2E8F0" strokeWidth={1} strokeDasharray="3 2"
          />
        )}

        {tooltip !== null && series.map((s) => (
          <circle
            key={s.key}
            cx={sx(tooltip.i)}
            cy={sy(data[tooltip.i][s.key] as number)}
            r={3.5} fill={s.color}
          />
        ))}

        {data.map((_, i) => (
          <rect
            key={`hover-${i}`}
            x={sx(i) - xStep / 2} y={PAD.t}
            width={xStep} height={innerH}
            fill="transparent"
            onMouseEnter={() => setTooltip({ i })}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: "crosshair" }}
          />
        ))}
      </svg>

      {tooltip !== null && (() => {
        const d = data[tooltip.i];
        const pct = sx(tooltip.i) / W * 100;
        return (
          <div style={{
            position: "absolute", top: 8, pointerEvents: "none",
            left: `clamp(0px, ${pct}%, calc(100% - 130px))`,
            background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 6,
            padding: "7px 10px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", minWidth: 120,
          }}>
            <p style={{ fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{d[xKey]}</p>
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
                <span style={{ color: "#64748B" }}>{s.label}:</span>
                <span style={{ color: "#0F172A", fontWeight: 500, fontFamily: "JetBrains Mono, monospace" }}>
                  {(d[s.key] as number).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ── Single Area Chart ─────────────────────────────────────────────────────────
function SvgAreaChart({ data, dataKey, xKey, color, height = 240, formatY }: {
  data: Record<string, any>[];
  dataKey: string;
  xKey: string;
  color: string;
  height?: number;
  formatY?: (v: number) => string;
}) {
  const W = 480;
  const H = height;
  const innerH = H - PAD.t - PAD.b;

  const vals = data.map((d) => d[dataKey] as number);
  const maxVal = Math.max(...vals);
  const minVal = 0;

  const sx = (i: number) => scaleX(i, data.length, W);
  const sy = (v: number) => scaleY(v, minVal, maxVal, H);

  const ticks = yTicks(minVal, maxVal);
  const [tooltip, setTooltip] = useState<{ i: number } | null>(null);
  const xStep = (W - PAD.l - PAD.r) / (data.length - 1);

  const linePoints = data.map((d, i) => `${sx(i)},${sy(d[dataKey] as number)}`).join(" ");
  const areaPoints = `${PAD.l},${H - PAD.b} ${linePoints} ${sx(data.length - 1)},${H - PAD.b}`;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
        {ticks.map((t, i) => {
          const cy = sy(t);
          return (
            <g key={`yt-${i}`}>
              <line x1={PAD.l} x2={W - PAD.r} y1={cy} y2={cy} stroke="#F1F5F9" strokeWidth={1} />
              <text x={PAD.l - 5} y={cy + 3.5} textAnchor="end" fontSize={9} fill="#94A3B8">
                {formatY ? formatY(t) : fmtY(t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => (
          <text key={`xl-${i}`} x={sx(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#94A3B8">
            {d[xKey]}
          </text>
        ))}

        <polygon points={areaPoints} fill={color} fillOpacity={0.1} />
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {tooltip !== null && (
          <>
            <line x1={sx(tooltip.i)} x2={sx(tooltip.i)} y1={PAD.t} y2={H - PAD.b} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="3 2" />
            <circle cx={sx(tooltip.i)} cy={sy(data[tooltip.i][dataKey] as number)} r={3.5} fill={color} />
          </>
        )}

        {data.map((_, i) => (
          <rect
            key={`hover-${i}`}
            x={sx(i) - xStep / 2} y={PAD.t}
            width={xStep} height={innerH}
            fill="transparent"
            onMouseEnter={() => setTooltip({ i })}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: "crosshair" }}
          />
        ))}
      </svg>

      {tooltip !== null && (() => {
        const d = data[tooltip.i];
        const pct = sx(tooltip.i) / W * 100;
        return (
          <div style={{
            position: "absolute", top: 8, pointerEvents: "none",
            left: `clamp(0px, ${pct}%, calc(100% - 130px))`,
            background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 6,
            padding: "7px 10px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", minWidth: 110,
          }}>
            <p style={{ fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{d[xKey]}</p>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
              <span style={{ color: "#0F172A", fontWeight: 500, fontFamily: "JetBrains Mono, monospace" }}>
                {formatY ? formatY(d[dataKey] as number) : (d[dataKey] as number).toLocaleString()}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const emailData = [
  { month: "Jan", sends: 58000, opens: 19720, clicks: 3944 },
  { month: "Feb", sends: 72000, opens: 24480, clicks: 4896 },
  { month: "Mar", sends: 95000, opens: 32300, clicks: 6460 },
  { month: "Apr", sends: 88000, opens: 29920, clicks: 5984 },
  { month: "May", sends: 124000, opens: 42160, clicks: 8432 },
  { month: "Jun", sends: 214550, opens: 73430, clicks: 14600 },
];

const customerData = [
  { month: "Jan", new: 1240, returning: 4800, churned: 210 },
  { month: "Feb", new: 1560, returning: 5200, churned: 180 },
  { month: "Mar", new: 2100, returning: 6100, churned: 290 },
  { month: "Apr", new: 1820, returning: 5800, churned: 250 },
  { month: "May", new: 2480, returning: 7200, churned: 320 },
  { month: "Jun", new: 3100, returning: 8900, churned: 410 },
];

const revenueData = [
  { month: "Jan", revenue: 28400 },
  { month: "Feb", revenue: 34100 },
  { month: "Mar", revenue: 48200 },
  { month: "Apr", revenue: 41800 },
  { month: "May", revenue: 62400 },
  { month: "Jun", revenue: 82410 },
];

const topCampaigns = [
  { name: "Abandoned Cart Recovery", revenue: "$18,700", opens: "41.6%", clicks: "12.1%", roi: "8.2x" },
  { name: "Summer Sale VIP",         revenue: "$14,800", opens: "38.2%", clicks: "7.4%",  roi: "6.1x" },
  { name: "Win-back Flow",           revenue: "$9,800",  opens: "22.1%", clicks: "3.9%",  roi: "3.4x" },
  { name: "VIP Loyalty Reward",      revenue: "$3,400",  opens: "58.0%", clicks: "14.2%", roi: "9.8x" },
];

const summaryKpis = [
  { label: "Total Revenue Attributed", value: "$82,410", delta: "+17.6%", up: true },
  { label: "Deliverability Rate",      value: "98.4%",   delta: "+0.2%",  up: true },
  { label: "List Growth Rate",         value: "+6.4%",   delta: "+1.1pp", up: true },
  { label: "Unsubscribe Rate",         value: "0.6%",    delta: "+0.04%", up: false },
];

const tabs = ["Email Performance", "Customer Insights", "Ecommerce"];

// ── View ──────────────────────────────────────────────────────────────────────
export function AnalyticsView() {
  const [activeTab, setActiveTab] = useState("Email Performance");
  const [dateRange, setDateRange] = useState("6M");
  const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: font }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#F1F5F9", width: "fit-content" }}>
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                fontSize: 12, fontWeight: 500, padding: "5px 16px", borderRadius: 6,
                background: activeTab === tab ? "#FFFFFF" : "transparent",
                color: activeTab === tab ? "#0F172A" : "#64748B",
                border: activeTab === tab ? "1px solid var(--border)" : "none",
                cursor: "pointer", fontFamily: font,
              }}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          {["7D", "30D", "90D", "6M", "1Y"].map((r) => (
            <button key={r} onClick={() => setDateRange(r)}
              style={{
                fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 4,
                background: r === dateRange ? "#0F172A" : "#F8FAFC",
                color: r === dateRange ? "#FFFFFF" : "#64748B",
                border: "1px solid var(--border)", cursor: "pointer", fontFamily: font,
              }}>
              {r}
            </button>
          ))}
          <button style={{ fontSize: 11, fontWeight: 500, padding: "4px 12px", borderRadius: 4, background: "#2563EB", color: "#FFFFFF", border: "none", cursor: "pointer", fontFamily: font }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {summaryKpis.map((k) => (
          <div key={k.label} className="rounded-lg p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: 11, color: "#64748B" }}>{k.label}</p>
              <span className="flex items-center gap-0.5"
                style={{ fontSize: 11, fontWeight: 500, color: k.up ? "#16A34A" : "#DC2626", fontFamily: "JetBrains Mono, monospace" }}>
                {k.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {k.delta}
              </span>
            </div>
            <p style={{ fontSize: 24, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{k.value}</p>
          </div>
        ))}
      </div>

      {activeTab === "Email Performance" && (
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Send Volume & Engagement</h3>
              <p style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>Monthly sends, opens, and clicks</p>
              <SvgBarChart
                data={emailData}
                xKey="month"
                series={[
                  { key: "sends",  label: "Sends",  color: "#C7D2FE" },
                  { key: "opens",  label: "Opens",  color: "#2563EB" },
                  { key: "clicks", label: "Clicks", color: "#10B981" },
                ]}
                height={220}
              />
              <div className="flex gap-4 mt-2">
                {[["#C7D2FE","Sends"],["#2563EB","Opens"],["#10B981","Clicks"]].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <span className="rounded-full" style={{ width: 8, height: 8, background: c, display: "inline-block" }} />
                    <span style={{ fontSize: 11, color: "#64748B" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Top Revenue Campaigns</h3>
              <p style={{ fontSize: 11, color: "#64748B", marginBottom: 16 }}>By revenue attributed</p>
              <div className="space-y-4">
                {topCampaigns.map((c, i) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#0F172A" }}>{c.name}</span>
                      <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", fontWeight: 600, color: "#0F172A" }}>{c.revenue}</span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 4, background: "#F1F5F9" }}>
                      <div className="rounded-full" style={{
                        height: "100%", width: `${(4 - i) * 22 + 10}%`,
                        background: ["#2563EB","#7C3AED","#10B981","#F59E0B"][i],
                      }} />
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span style={{ fontSize: 10, color: "#64748B" }}>Open {c.opens}</span>
                      <span style={{ fontSize: 10, color: "#64748B" }}>Click {c.clicks}</span>
                      <span style={{ fontSize: 10, color: "#16A34A", fontWeight: 500 }}>ROI {c.roi}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Customer Insights" && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>New vs Returning</h3>
            <p style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>Monthly customer cohorts</p>
            <SvgLineChart
              data={customerData}
              xKey="month"
              series={[
                { key: "new",       label: "New",       color: "#2563EB" },
                { key: "returning", label: "Returning", color: "#10B981" },
              ]}
              height={220}
            />
            <div className="flex gap-4 mt-2">
              {[["#2563EB","New"],["#10B981","Returning"]].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className="rounded-full" style={{ width: 8, height: 8, background: c, display: "inline-block" }} />
                  <span style={{ fontSize: 11, color: "#64748B" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Churn Rate</h3>
            <p style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>Monthly churned contacts</p>
            <SvgLineChart
              data={customerData}
              xKey="month"
              series={[{ key: "churned", label: "Churned", color: "#EF4444" }]}
              height={220}
            />
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="rounded-full" style={{ width: 8, height: 8, background: "#EF4444", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#64748B" }}>Churned</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Ecommerce" && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-lg p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Revenue Over Time</h3>
            <p style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>Attributed email revenue by month</p>
            <SvgAreaChart
              data={revenueData}
              dataKey="revenue"
              xKey="month"
              color="#7C3AED"
              height={220}
              formatY={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="rounded-full" style={{ width: 8, height: 8, background: "#7C3AED", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#64748B" }}>Revenue</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg p-5 space-y-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Ecommerce KPIs</h3>
            {[
              { label: "Total Revenue",    value: "$82,410", delta: "+17.6%" },
              { label: "Total Orders",     value: "2,010",   delta: "+27.2%" },
              { label: "Avg Order Value",  value: "$41.00",  delta: "+3.8%"  },
              { label: "Conversion Rate",  value: "3.4%",    delta: "+0.4pp" },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #F8FAFC" }}>
                <span style={{ fontSize: 12, color: "#64748B" }}>{m.label}</span>
                <div className="text-right">
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{m.value}</p>
                  <p style={{ fontSize: 10, color: "#16A34A" }}>{m.delta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}