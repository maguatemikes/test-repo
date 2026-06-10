"use client";

import { Search, Upload, Download, MoreHorizontal, Star, AlertTriangle, UserPlus, RefreshCw, X, ShoppingBag, Mail, MapPin, Activity, ChevronRight, Package, SlidersHorizontal } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListsView } from "./ListsView";
import { SegmentsView } from "./SegmentsView";
import { ImportCsvModal } from "../ImportCsvModal";

const mockCustomers = [
  { id: "C001", name: "Sarah Mitchell", email: "sarah.m@outlook.com", phone: "+1 (555) 201-4821", tags: ["VIP", "Loyal"], spend: "$4,820", ltv: 4820, lastOrder: "Jun 2, 2026", lastEmail: "3h ago", status: "active", location: "New York, USA", joined: "Mar 12, 2024" },
  { id: "C002", name: "James Okafor", email: "j.okafor@gmail.com", phone: "+1 (555) 938-2210", tags: ["At Risk"], spend: "$1,240", ltv: 1240, lastOrder: "Jan 14, 2026", lastEmail: "68d ago", status: "at-risk", location: "Lagos, Nigeria", joined: "Aug 5, 2024" },
  { id: "C003", name: "Priya Nair", email: "priya.nair@work.co", phone: "+91 98210 55312", tags: ["VIP", "High LTV"], spend: "$9,100", ltv: 9100, lastOrder: "May 28, 2026", lastEmail: "6d ago", status: "active", location: "Bangalore, India", joined: "Jan 2, 2023" },
  { id: "C004", name: "Tom Hargreaves", email: "t.hargreaves@icloud.com", phone: "+44 7911 123456", tags: ["New"], spend: "$89", ltv: 89, lastOrder: "May 31, 2026", lastEmail: "4d ago", status: "new", location: "London, UK", joined: "May 29, 2026" },
  { id: "C005", name: "Aisha Balogun", email: "aisha.b@netco.ng", phone: "+234 802 345 6789", tags: ["Has Refund"], spend: "$620", ltv: 620, lastOrder: "Apr 10, 2026", lastEmail: "24d ago", status: "refund", location: "Abuja, Nigeria", joined: "Nov 18, 2024" },
  { id: "C006", name: "David Chen", email: "dchen@devhub.io", phone: "+1 (415) 820-3344", tags: ["VIP"], spend: "$6,450", ltv: 6450, lastOrder: "Jun 1, 2026", lastEmail: "1d ago", status: "active", location: "San Francisco, USA", joined: "Jun 1, 2023" },
  { id: "C007", name: "Rachel Whitfield", email: "rachel.w@studio.com", phone: "+1 (303) 411-2298", tags: ["Loyal"], spend: "$2,310", ltv: 2310, lastOrder: "May 20, 2026", lastEmail: "15d ago", status: "active", location: "Denver, USA", joined: "Feb 14, 2024" },
  { id: "C008", name: "Marcus Alves", email: "m.alves@br.net", phone: "+55 11 91234-5678", tags: ["At Risk", "Has Refund"], spend: "$480", ltv: 480, lastOrder: "Feb 3, 2026", lastEmail: "90d ago", status: "at-risk", location: "São Paulo, Brazil", joined: "Sep 7, 2023" },
  { id: "C009", name: "Yuki Tanaka", email: "yuki.t@hana.jp", phone: "+81 90-1234-5678", tags: ["New"], spend: "$142", ltv: 142, lastOrder: "Jun 3, 2026", lastEmail: "1h ago", status: "new", location: "Tokyo, Japan", joined: "Jun 1, 2026" },
  { id: "C010", name: "Emma Larsson", email: "emma.l@se.com", phone: "+46 70 123 45 67", tags: ["VIP", "Loyal", "High LTV"], spend: "$12,800", ltv: 12800, lastOrder: "Jun 3, 2026", lastEmail: "12h ago", status: "active", location: "Stockholm, Sweden", joined: "Oct 3, 2022" },
];

const drawerOrders: Record<string, { id: string; product: string; amount: string; date: string; status: string }[]> = {
  C001: [
    { id: "#ORD-8821", product: "Summer Essentials Bundle", amount: "$249", date: "Jun 2, 2026", status: "delivered" },
    { id: "#ORD-7412", product: "Premium Sneakers (White, 9)", amount: "$189", date: "Apr 12, 2026", status: "delivered" },
    { id: "#ORD-6901", product: "Linen Shirt — Navy", amount: "$89", date: "Feb 28, 2026", status: "delivered" },
  ],
  C003: [
    { id: "#ORD-9003", product: "Luxury Silk Dress", amount: "$410", date: "May 28, 2026", status: "delivered" },
    { id: "#ORD-8441", product: "Gold Hoop Earrings", amount: "$220", date: "Mar 5, 2026", status: "delivered" },
  ],
  C006: [
    { id: "#ORD-8900", product: "Tech Accessories Kit", amount: "$320", date: "Jun 1, 2026", status: "delivered" },
    { id: "#ORD-8022", product: "Minimalist Watch", amount: "$490", date: "Apr 18, 2026", status: "delivered" },
  ],
};

const drawerActivity: Record<string, { time: string; event: string; detail: string }[]> = {
  C001: [
    { time: "3h ago", event: "Email opened", detail: "Summer Sale VIP — 38% open rate campaign" },
    { time: "1d ago", event: "Order delivered", detail: "#ORD-8821 — Summer Essentials Bundle" },
    { time: "3d ago", event: "Email clicked", detail: "June Newsletter CTA: Shop Now" },
    { time: "5d ago", event: "Profile updated", detail: "Added shipping address" },
    { time: "8d ago", event: "Email opened", detail: "Win-back: 60-Day Inactive (not segmented — manual)" },
  ],
  default: [
    { time: "Recently", event: "Profile created", detail: "Imported via Shopify sync" },
    { time: "2d ago", event: "Email sent", detail: "June Newsletter" },
    { time: "4d ago", event: "Email opened", detail: "Last campaign" },
  ],
};

const chipFilters = [
  { label: "All", value: "all", icon: null },
  { label: "VIP", value: "VIP", icon: Star },
  { label: "At Risk", value: "At Risk", icon: AlertTriangle },
  { label: "New", value: "New", icon: UserPlus },
  { label: "Has Refund", value: "Has Refund", icon: RefreshCw },
];

const tagStyles: Record<string, { bg: string; color: string }> = {
  VIP: { bg: "#FFF7ED", color: "#C2410C" },
  "At Risk": { bg: "#FFF1F2", color: "#BE123C" },
  New: { bg: "#F0FDF4", color: "#15803D" },
  "Has Refund": { bg: "#FEF9C3", color: "#854D0E" },
  Loyal: { bg: "#EFF6FF", color: "#1D4ED8" },
  "High LTV": { bg: "#F5F3FF", color: "#6D28D9" },
};

type SubTab = "customers" | "lists" | "segments";
type DrawerTab = "overview" | "orders" | "engagement" | "activity";

const subTabs: { id: SubTab; label: string }[] = [
  { id: "customers", label: "All Customers" },
  { id: "lists", label: "Lists" },
  { id: "segments", label: "Segments" },
];

function avatarColor(id: string) {
  const colors = ["#2563EB", "#7C3AED", "#DB2777", "#059669", "#D97706", "#DC2626", "#0891B2"];
  const idx = id.charCodeAt(1) % colors.length;
  return colors[idx];
}

type CRow = (typeof mockCustomers)[number] & { channel?: string; source?: string };

// Column-driven table so columns can be shown/hidden.
const CUSTOMER_COLUMNS: { key: string; label: string; render: (c: CRow) => React.ReactNode }[] = [
  {
    key: "name", label: "Name / Email",
    render: (c) => (
      <div className="flex items-center gap-2.5">
        <div className="rounded-full flex items-center justify-center text-white shrink-0" style={{ width: 28, height: 28, background: avatarColor(c.id), fontSize: 10, fontWeight: 500 }}>
          {c.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{c.name}</p>
          <p style={{ fontSize: 11, color: "#64748B" }}>{c.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: "tags", label: "Tags",
    render: (c) => (
      <div className="flex flex-wrap gap-1">
        {c.tags.map((tag) => {
          const ts = tagStyles[tag] || { bg: "#F1F5F9", color: "#64748B" };
          return <span key={tag} className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: ts.bg, color: ts.color }}>{tag}</span>;
        })}
      </div>
    ),
  },
  { key: "spend", label: "Lifetime Spend", render: (c) => <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{c.spend}</span> },
  { key: "lastOrder", label: "Last Order", render: (c) => <span style={{ fontSize: 12, color: "#64748B" }}>{c.lastOrder}</span> },
  { key: "lastEmail", label: "Last Engagement", render: (c) => <span style={{ fontSize: 12, color: "#64748B" }}>{c.lastEmail}</span> },
  { key: "channel", label: "Channel", render: (c) => (c.channel && c.channel !== "—" ? <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: "#EFF6FF", color: "#1D4ED8" }}>{c.channel}</span> : <span style={{ fontSize: 12, color: "#CBD5E1" }}>—</span>) },
  { key: "source", label: "Source", render: (c) => (c.source && c.source !== "—" ? <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: "#F1F5F9", color: "#475569" }}>{c.source}</span> : <span style={{ fontSize: 12, color: "#CBD5E1" }}>—</span>) },
];
const HIDEABLE_COLUMNS = CUSTOMER_COLUMNS.filter((c) => c.key !== "name");

function CustomerDrawer({ customer, onClose }: { customer: typeof mockCustomers[0]; onClose: () => void }) {
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("overview");
  const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
  const [orders, setOrders] = useState<{ id: number; orderNumber: string; total: number; status: string; date: string | null; itemCount: number; channel: string | null }[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setOrdersLoading(true);
    fetch(`/api/customers/${encodeURIComponent(customer.id)}/orders`)
      .then((r) => r.json())
      .then((d) => { if (active) setOrders(d.orders || []); })
      .catch(() => { if (active) setOrders([]); })
      .finally(() => { if (active) setOrdersLoading(false); });
    return () => { active = false; };
  }, [customer.id]);

  // Manual tags (crm-api): the customer's tags + the org tag library.
  const [manualTags, setManualTags] = useState<{ id: number; name: string; color: string }[]>([]);
  const [allTags, setAllTags] = useState<{ id: number; name: string; color: string }[]>([]);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const reloadCustomerTags = () =>
    fetch(`/api/customers/${encodeURIComponent(customer.id)}/tags`).then((r) => r.json()).then((d) => setManualTags(d.tags || [])).catch(() => {});
  const reloadAllTags = () =>
    fetch(`/api/tags`).then((r) => r.json()).then((d) => setAllTags(d.tags || [])).catch(() => {});
  useEffect(() => { reloadCustomerTags(); reloadAllTags(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [customer.id]);
  const attachTag = async (tagId: number) => {
    await fetch(`/api/customers/${encodeURIComponent(customer.id)}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tagId }) });
    setTagPickerOpen(false); reloadCustomerTags();
  };
  const detachTag = async (tagId: number) => {
    await fetch(`/api/customers/${encodeURIComponent(customer.id)}/tags/${tagId}`, { method: "DELETE" });
    reloadCustomerTags();
  };
  const createAndAttach = async () => {
    const name = newTagName.trim();
    if (!name) return;
    const d = await fetch(`/api/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).then((r) => r.json()).catch(() => ({}));
    if (d.ok && d.tag?.id) { setNewTagName(""); await attachTag(d.tag.id); reloadAllTags(); }
  };

  const activity = drawerActivity[customer.id] || drawerActivity.default;
  const initials = customer.name.split(" ").map((n) => n[0]).join("");
  const fmtMoney = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

  const drawerTabs: { id: DrawerTab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "engagement", label: "Engagement", icon: Mail },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  const engagementStats = [
    { label: "Emails Received", value: "142" },
    { label: "Open Rate", value: "41.2%" },
    { label: "Click Rate", value: "8.4%" },
    { label: "Unsubscribes", value: "0" },
    { label: "Last Opened", value: customer.lastEmail },
    { label: "Campaigns", value: "18" },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.25)", zIndex: 100 }}
      />
      {/* Drawer */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px, 100vw)",
          background: "#FFFFFF", borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 32px rgba(15,23,42,0.12)", zIndex: 101,
          display: "flex", flexDirection: "column", fontFamily: font,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="rounded-full flex items-center justify-center text-white shrink-0"
              style={{ width: 44, height: 44, background: avatarColor(customer.id), fontSize: 14, fontWeight: 600 }}
            >
              {initials}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{customer.name}</p>
              <p style={{ fontSize: 12, color: "#64748B" }}>{customer.email}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {customer.tags.map((tag) => {
                  const ts = tagStyles[tag] || { bg: "#F1F5F9", color: "#64748B" };
                  return (
                    <span key={tag} className="rounded-full px-2 py-0.5"
                      style={{ fontSize: 10, fontWeight: 500, background: ts.bg, color: ts.color }}>
                      {tag}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1" style={{ color: "#94A3B8" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Manual tags (crm-api) */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.04em", marginRight: 2 }}>TAGS</span>
            {manualTags.map((t) => (
              <span key={t.id} className="rounded-full px-2 py-0.5 flex items-center gap-1" style={{ fontSize: 10, fontWeight: 500, background: `${t.color || "#2563EB"}1f`, color: t.color || "#2563EB" }}>
                {t.name}
                <button onClick={() => detachTag(t.id)} title="Remove" style={{ color: "inherit", opacity: 0.6, cursor: "pointer", display: "flex" }}><X size={9} /></button>
              </span>
            ))}
            <div style={{ position: "relative" }}>
              <button onClick={() => setTagPickerOpen((o) => !o)} className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, border: "1px dashed var(--border)", color: "#64748B", cursor: "pointer", background: "#FFFFFF" }}>+ Tag</button>
              {tagPickerOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: 200, background: "#FFFFFF", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 120, padding: 6 }}>
                  {allTags.filter((t) => !manualTags.some((m) => m.id === t.id)).map((t) => (
                    <button key={t.id} onClick={() => attachTag(t.id)} className="flex items-center gap-2 w-full px-2 py-1.5 rounded" style={{ fontSize: 12, color: "#334155", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <span className="rounded-full" style={{ width: 8, height: 8, background: t.color || "#2563EB", display: "inline-block" }} />{t.name}
                    </button>
                  ))}
                  <div className="flex gap-1 mt-1 pt-1" style={{ borderTop: "1px solid #F1F5F9" }}>
                    <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag…"
                      onKeyDown={(e) => { if (e.key === "Enter") createAndAttach(); }}
                      style={{ flex: 1, fontSize: 11, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, outline: "none", color: "#0F172A" }} />
                    <button onClick={createAndAttach} style={{ fontSize: 11, color: "#FFFFFF", background: "#2563EB", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Add</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
          {drawerTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setDrawerTab(t.id)}
              style={{
                fontSize: 12, fontWeight: 500, padding: "10px 12px",
                color: drawerTab === t.id ? "#2563EB" : "#64748B",
                borderBottom: drawerTab === t.id ? "2px solid #2563EB" : "2px solid transparent",
                fontFamily: font,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {drawerTab === "overview" && (
            <div className="space-y-4">
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "LTV", value: customer.spend },
                  { label: "Orders", value: String(orders.length || Math.floor(customer.ltv / 150)) },
                  { label: "Joined", value: customer.joined.split(",")[0] },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-lg p-3 text-center" style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{kpi.value}</p>
                    <p style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{kpi.label}</p>
                  </div>
                ))}
              </div>

              {/* Contact details */}
              <div className="rounded-lg p-4 space-y-3" style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em" }}>CONTACT</p>
                {[
                  { icon: Mail, label: customer.email },
                  { icon: MapPin, label: customer.location },
                  { icon: Package, label: `Joined ${customer.joined}` },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Icon size={13} color="#94A3B8" />
                    <span style={{ fontSize: 12, color: "#374151" }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Recent orders preview */}
              {orders.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", marginBottom: 8 }}>RECENT ORDERS</p>
                  <div className="space-y-2">
                    {orders.slice(0, 2).map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg p-3"
                        style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>Order #{o.orderNumber}</p>
                          <p style={{ fontSize: 11, color: "#64748B" }}>{o.channel ? `${o.channel} · ` : ""}{fmtDate(o.date)}</p>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{fmtMoney(o.total)}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setDrawerTab("orders")} className="flex items-center gap-1 mt-2"
                    style={{ fontSize: 11, color: "#2563EB" }}>
                    View all orders <ChevronRight size={11} />
                  </button>
                </div>
              )}
            </div>
          )}

          {drawerTab === "orders" && (
            <div>
              {ordersLoading ? (
                <div className="text-center py-12"><p style={{ fontSize: 13, color: "#94A3B8" }}>Loading orders…</p></div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag size={28} color="#CBD5E1" className="mx-auto mb-3" />
                  <p style={{ fontSize: 13, color: "#64748B" }}>No orders found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-lg p-4" style={{ border: "1px solid var(--border)", background: "#FAFAFA" }}>
                      <div className="flex items-start justify-between mb-1">
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>Order #{o.orderNumber}</p>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{fmtMoney(o.total)}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span style={{ fontSize: 11, color: "#64748B" }}>{o.itemCount} item{o.itemCount === 1 ? "" : "s"}</span>
                        <span style={{ fontSize: 11, color: "#64748B" }}>{fmtDate(o.date)}</span>
                        {o.channel && <span style={{ fontSize: 11, color: "#64748B" }}>{o.channel}</span>}
                        <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: "#F0FDF4", color: "#15803D" }}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {drawerTab === "engagement" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {engagementStats.map((s) => (
                  <div key={s.label} className="rounded-lg p-3" style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{s.value}</p>
                    <p style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-4" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "#1D4ED8" }}>Email preferences</p>
                <p style={{ fontSize: 11, color: "#3B82F6", marginTop: 4 }}>Subscribed to all marketing emails. No suppressions active.</p>
              </div>
            </div>
          )}

          {drawerTab === "activity" && (
            <div className="relative">
              <div style={{ position: "absolute", left: 15, top: 4, bottom: 4, width: 1, background: "#E2E8F0" }} />
              <div className="space-y-4 pl-8">
                {activity.map((a, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <div style={{
                      position: "absolute", left: -24, top: 3,
                      width: 8, height: 8, borderRadius: "50%",
                      background: "#2563EB", border: "2px solid #FFFFFF",
                      boxShadow: "0 0 0 2px #BFDBFE",
                    }} />
                    <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{a.event}</p>
                    <p style={{ fontSize: 11, color: "#64748B", marginTop: 1 }}>{a.detail}</p>
                    <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{a.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 p-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button className="flex-1 rounded-lg py-2"
            style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", border: "none", cursor: "pointer", fontFamily: font }}>
            Send Email
          </button>
          <button className="flex-1 rounded-lg py-2"
            style={{ fontSize: 12, fontWeight: 500, background: "#F1F5F9", color: "#374151", border: "1px solid var(--border)", cursor: "pointer", fontFamily: font }}>
            Add Tag
          </button>
        </div>
      </div>
    </>
  );
}

interface CustomersViewProps {
  initialTab?: SubTab;
  onSubTabChange?: (tab: SubTab) => void;
  /** Current page of customers from the DB (already searched + paginated server-side). */
  dbCustomers?: ((typeof mockCustomers)[number] & { channel?: string; source?: string })[];
  total?: number;
  page?: number;
  pageSize?: number;
  serverQuery?: string;
  serverTag?: string;
  serverSource?: string;
  serverChannel?: string;
  channels?: string[];
  onSearch?: (q: string) => void;
  onFilter?: (key: "tag" | "source" | "channel", value: string) => void;
  onPage?: (p: number) => void;
}

export function CustomersView({
  initialTab = "customers", onSubTabChange, dbCustomers,
  total = 0, page = 1, pageSize = 100, serverQuery = "",
  serverTag = "", serverSource = "", serverChannel = "", channels = [],
  onSearch, onFilter, onPage,
}: CustomersViewProps) {
  // Server-driven list (search + filters + pagination happen in the DB).
  const customers = dbCustomers ?? [];
  const [subTab, setSubTab] = useState<SubTab>(initialTab);
  const [query, setQuery] = useState(serverQuery);
  const [colsOpen, setColsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CUSTOMER_COLUMNS.map((c) => [c.key, true])),
  );
  useEffect(() => {
    try {
      const s = localStorage.getItem("crm_cust_cols");
      if (s) setVisibleCols((prev) => ({ ...prev, ...JSON.parse(s) }));
    } catch {}
  }, []);
  const toggleCol = (k: string) =>
    setVisibleCols((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      try { localStorage.setItem("crm_cust_cols", JSON.stringify(next)); } catch {}
      return next;
    });

  // Close the Columns dropdown when clicking outside it.
  const colsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!colsOpen) return;
    const handler = (e: MouseEvent) => {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [colsOpen]);
  const [selected, setSelected] = useState<string[]>([]);
  const [drawerCustomer, setDrawerCustomer] = useState<typeof mockCustomers[0] | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Sync when sidebar drives a tab change externally
  useEffect(() => { setSubTab(initialTab); }, [initialTab]);

  // Realtime search: debounce typing, then push the query to the server (URL).
  useEffect(() => {
    if (query === serverQuery) return;
    const t = setTimeout(() => onSearch?.(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query, serverQuery, onSearch]);

  const handleSubTab = (tab: SubTab) => {
    setSubTab(tab);
    onSubTabChange?.(tab);
  };

  const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

  // Everything (search, tag, source, channel, pagination) is server-side now.
  const filtered = customers;

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const allSelected = selected.length === filtered.length && filtered.length > 0;

  const tabBar = (
    <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#F1F5F9", width: "fit-content" }}>
      {subTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleSubTab(tab.id)}
          style={{
            fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 6,
            background: subTab === tab.id ? "#FFFFFF" : "transparent",
            color: subTab === tab.id ? "#0F172A" : "#64748B",
            border: subTab === tab.id ? "1px solid var(--border)" : "none",
            fontFamily: font,
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  if (subTab === "lists") {
    return (
      <div style={{ fontFamily: font }}>
        <div className="px-6 pt-5 pb-0">{tabBar}</div>
        <ListsView />
      </div>
    );
  }

  if (subTab === "segments") {
    return (
      <div style={{ fontFamily: font }}>
        <div className="px-6 pt-5 pb-0">{tabBar}</div>
        <SegmentsView />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4" style={{ fontFamily: font }}>
      {drawerCustomer && (
        <CustomerDrawer customer={drawerCustomer} onClose={() => setDrawerCustomer(null)} />
      )}
      {csvModalOpen && (
        <ImportCsvModal onClose={() => setCsvModalOpen(false)} context="customers" />
      )}

      {tabBar}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg flex-1 min-w-[180px] max-w-xs"
          style={{ background: "#FFFFFF", border: "1px solid var(--border)", padding: "7px 12px" }}>
          <Search size={13} color="#94A3B8" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers…"
            style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#0F172A", width: "100%", fontFamily: font }}
          />
        </div>

        {/* Tag filter chips (server-side) */}
        <div className="flex items-center gap-2 flex-wrap">
          {chipFilters.map((chip) => {
            const Icon = chip.icon;
            const isActive = chip.value === "all" ? !serverTag : serverTag === chip.value;
            return (
              <button
                key={chip.value}
                onClick={() => onFilter?.("tag", chip.value === "all" ? "" : chip.value)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{
                  fontSize: 12, fontWeight: 500,
                  background: isActive ? "#0F172A" : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : "#64748B",
                  border: `1px solid ${isActive ? "#0F172A" : "var(--border)"}`,
                  fontFamily: font, cursor: "pointer",
                }}
              >
                {Icon && <Icon size={11} />}
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Source filter */}
        <select value={serverSource} onChange={(e) => onFilter?.("source", e.target.value)}
          style={{ fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "#FFFFFF", color: "#64748B", fontFamily: font, cursor: "pointer" }}>
          <option value="">All sources</option>
          <option value="form">Form</option>
          <option value="netx_backfill">Import</option>
          <option value="api">API</option>
        </select>

        {/* Channel filter */}
        <select value={serverChannel} onChange={(e) => onFilter?.("channel", e.target.value)}
          style={{ fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "#FFFFFF", color: "#64748B", fontFamily: font, cursor: "pointer", maxWidth: 180 }}>
          <option value="">All channels</option>
          {channels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
        </select>

        <div className="flex-1" />

        {/* Columns show/hide */}
        <div ref={colsRef} style={{ position: "relative" }}>
          <button onClick={() => setColsOpen((o) => !o)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
            style={{ fontSize: 12, background: "#FFFFFF", border: "1px solid var(--border)", color: "#64748B", fontFamily: font, cursor: "pointer" }}>
            <SlidersHorizontal size={13} /> Columns
          </button>
          {colsOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 190, background: "#FFFFFF", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 50, padding: 6 }}>
              {HIDEABLE_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer" style={{ fontSize: 12, color: "#334155" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <input type="checkbox" checked={!!visibleCols[col.key]} onChange={() => toggleCol(col.key)} style={{ accentColor: "#2563EB" }} />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12, color: "#64748B" }}>{selected.length} selected</span>
            <button style={{ fontSize: 12, color: "#2563EB", fontWeight: 500 }}>Tag</button>
            <button style={{ fontSize: 12, color: "#DC2626", fontWeight: 500 }}>Suppress</button>
          </div>
        )}

        <button
          onClick={() => setCsvModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
          style={{ fontSize: 12, background: "#FFFFFF", border: "1px solid var(--border)", color: "#64748B", fontFamily: font, cursor: "pointer" }}>
          <Upload size={13} /> Import CSV
        </button>
        <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
          style={{ fontSize: 12, background: "#FFFFFF", border: "1px solid var(--border)", color: "#64748B", fontFamily: font }}>
          <Download size={13} /> Export
        </button>
      </div>

      <div className="flex items-center gap-4">
        <span style={{ fontSize: 12, color: "#64748B" }}>
          {total > 0 ? (
            <>Showing <strong style={{ color: "#0F172A", fontWeight: 600 }}>{(page - 1) * pageSize + 1}–{(page - 1) * pageSize + filtered.length}</strong> of{" "}
            <strong style={{ color: "#0F172A", fontWeight: 600 }}>{total.toLocaleString()}</strong> customers{serverQuery ? ` matching “${serverQuery}”` : ""}</>
          ) : (
            <>No customers found{serverQuery ? ` for “${serverQuery}”` : ""}.</>
          )}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto"><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "9px 14px", width: 40 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => allSelected ? setSelected([]) : setSelected(filtered.map((c) => c.id))}
                  style={{ accentColor: "#2563EB" }}
                />
              </th>
              {CUSTOMER_COLUMNS.filter((col) => visibleCols[col.key]).map((col) => (
                <th key={col.key} style={{
                  textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B",
                  letterSpacing: "0.04em", padding: "9px 14px", fontFamily: font,
                }}>
                  {col.label.toUpperCase()}
                </th>
              ))}
              <th style={{ padding: "9px 14px" }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={99} style={{ padding: 0 }}>
                <EmptyState
                  icon={UserPlus}
                  title={serverQuery || serverTag || serverSource || serverChannel ? "No customers match your filters" : "No customers yet"}
                  description={serverQuery || serverTag || serverSource || serverChannel ? "Try clearing the search or filters." : "Customers appear here once they're imported or sign up via a form."}
                />
              </td></tr>
            )}
            {filtered.map((c, i) => {
              const isSelected = selected.includes(c.id);
              return (
                <tr
                  key={c.id}
                  onClick={() => setDrawerCustomer(c)}
                  style={{
                    borderBottom: i < filtered.length - 1 ? "1px solid #F8FAFC" : "none",
                    background: isSelected ? "#EFF6FF" : "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#FAFAFA"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? "#EFF6FF" : "transparent"; }}
                >
                  <td style={{ padding: "10px 14px" }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => setSelected((prev) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])}
                      style={{ accentColor: "#2563EB" }}
                    />
                  </td>
                  {CUSTOMER_COLUMNS.filter((col) => visibleCols[col.key]).map((col) => (
                    <td key={col.key} style={{ padding: "10px 14px" }}>{col.render(c)}</td>
                  ))}
                  <td style={{ padding: "10px 14px" }} onClick={(e) => e.stopPropagation()}>
                    <button style={{ color: "#94A3B8" }}><MoreHorizontal size={15} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>

        {/* Pagination (server-side) */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(total / pageSize));
          return (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 11, color: "#64748B", fontFamily: font }}>
                Page {page} of {totalPages.toLocaleString()}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => page > 1 && onPage?.(page - 1)}
                  disabled={page <= 1}
                  className="rounded"
                  style={{ fontSize: 11, padding: "3px 10px", background: "#F8FAFC", color: page <= 1 ? "#CBD5E1" : "#64748B", border: "1px solid var(--border)", fontFamily: font, cursor: page <= 1 ? "default" : "pointer" }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: 11, padding: "3px 10px", background: "#0F172A", color: "#FFFFFF", borderRadius: 4, fontFamily: font }}>{page}</span>
                <button
                  onClick={() => page < totalPages && onPage?.(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded"
                  style={{ fontSize: 11, padding: "3px 10px", background: "#F8FAFC", color: page >= totalPages ? "#CBD5E1" : "#64748B", border: "1px solid var(--border)", fontFamily: font, cursor: page >= totalPages ? "default" : "pointer" }}
                >
                  Next →
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}