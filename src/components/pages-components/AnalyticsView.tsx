"use client";

import { Mail, Users, ShoppingBag, DollarSign, RotateCcw, UserMinus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AnalyticsData } from "@/lib/api/analytics";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
const money2 = (n: number) => "$" + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (n: number) => "$" + Math.round(n || 0).toLocaleString();
const num = (n: number) => (n || 0).toLocaleString();
const pct = (n: number) => (n || 0).toFixed(1) + "%";

const RANGES: { key: string; label: string }[] = [
  { key: "30D", label: "30 days" },
  { key: "90D", label: "90 days" },
  { key: "6M", label: "6 months" },
  { key: "12M", label: "12 months" },
];
const TABS = ["Ecommerce", "Customer Insights", "Email Performance"];

function Kpi({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={14} color="#64748B" />}
        <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: 22, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function BarList({ items, color = "#2563EB", fmt }: { items: { label: string; value: number }[]; color?: string; fmt: (n: number) => string }) {
  if (items.length === 0) return <p style={{ fontSize: 12, color: "#94A3B8" }}>No data in this range.</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontSize: 12, color: "#374151" }}>{it.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{fmt(it.value)}</span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "#F1F5F9", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(it.value / max) * 100}%`, borderRadius: 999, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: subtitle ? 2 : 14 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 11, color: "#64748B", marginBottom: 16 }}>{subtitle}</p>}
      {children}
    </div>
  );
}

export function AnalyticsView({ data, rangeKey }: { data: AnalyticsData; rangeKey: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Ecommerce");
  const { email, customers, ecommerce } = data;

  if (!email && !customers && !ecommerce) {
    return (
      <div className="p-6" style={{ fontFamily: font }}>
        <EmptyState icon={ShoppingBag} title="No analytics available" description="We couldn't load analytics — your session may have expired. Try reloading the page." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4" style={{ fontFamily: font }}>
      {/* Tabs + date range */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#F1F5F9", width: "fit-content" }}>
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 6, background: activeTab === tab ? "#FFFFFF" : "transparent", color: activeTab === tab ? "#0F172A" : "#64748B", border: activeTab === tab ? "1px solid var(--border)" : "none", cursor: "pointer", fontFamily: font }}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => router.push(`/analytics?range=${r.key}`)}
              style={{ fontSize: 11, fontWeight: 500, padding: "5px 11px", borderRadius: 6, background: r.key === rangeKey ? "#0F172A" : "#F8FAFC", color: r.key === rangeKey ? "#FFFFFF" : "#64748B", border: "1px solid var(--border)", cursor: "pointer", fontFamily: font }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ECOMMERCE */}
      {activeTab === "Ecommerce" && ecommerce && (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Kpi label="Revenue" value={money2(ecommerce.revenue)} icon={DollarSign} />
            <Kpi label="Orders" value={num(ecommerce.orderCount)} icon={ShoppingBag} />
            <Kpi label="Buyers" value={num(ecommerce.buyerCount)} icon={Users} />
            <Kpi label="Avg. order value" value={money2(ecommerce.aov)} icon={DollarSign} />
          </div>
          <Card title="Revenue by channel" subtitle="Top sales channels in this range">
            <BarList items={ecommerce.topChannels.map((c) => ({ label: c.channel, value: c.revenue }))} fmt={money0} />
          </Card>
          <Card title="Orders by channel">
            <BarList items={ecommerce.topChannels.map((c) => ({ label: c.channel, value: c.orders }))} color="#7C3AED" fmt={num} />
          </Card>
        </>
      )}

      {/* CUSTOMER INSIGHTS */}
      {activeTab === "Customer Insights" && customers && (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Kpi label="Total customers" value={num(customers.totalCustomers)} icon={Users} />
            <Kpi label="New in range" value={num(customers.newInRange)} icon={Users} />
            <Kpi label="Returning" value={num(customers.returning)} icon={RotateCcw} />
            <Kpi label="Churned (180d)" value={num(customers.churn180dCount)} icon={UserMinus} />
          </div>
          <Card title="Lifetime value distribution" subtitle="Customers grouped by total spend">
            <BarList items={customers.ltvDistribution.map((b) => ({ label: b.bucket, value: b.count }))} fmt={num} />
          </Card>
        </>
      )}

      {/* EMAIL */}
      {activeTab === "Email Performance" && email && (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Kpi label="Sends" value={num(email.sends)} icon={Mail} />
            <Kpi label="Open rate" value={pct(email.openRate)} />
            <Kpi label="Click rate" value={pct(email.clickRate)} />
            <Kpi label="Unsub rate" value={pct(email.unsubRate)} />
          </div>
          <Card title="Top campaigns" subtitle="By revenue attributed">
            {email.topCampaigns.length === 0
              ? <p style={{ fontSize: 12, color: "#94A3B8" }}>No campaign data yet.</p>
              : <BarList items={email.topCampaigns.map((c) => ({ label: c.name, value: c.revenue }))} fmt={money0} />}
          </Card>
          {email.note && (
            <div className="flex items-start gap-2 rounded-lg p-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
              <Mail size={13} color="#2563EB" style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 11.5, color: "#1D4ED8" }}>{email.note}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
