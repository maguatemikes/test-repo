"use client";

import {
  Building2, Users, CreditCard, Plug, Mail, Key, Webhook, FileText,
  CheckCircle2, XCircle, AlertCircle, Plus, Trash2, Copy, RefreshCw
} from "lucide-react";
import { useState } from "react";

const settingsTabs = [
  { id: "org", label: "Organization", icon: Building2 },
  { id: "users", label: "Users & Roles", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "sending", label: "Sending Domains", icon: Mail },
  { id: "api", label: "API Keys", icon: Key },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "audit", label: "Audit Log", icon: FileText },
];

const teamMembers = [
  { name: "Ryan Nguyen", email: "ryan@acmecorp.io", role: "Super Admin", avatar: "RN", joined: "Jan 2026" },
  { name: "Priya Nair", email: "priya@acmecorp.io", role: "Admin", avatar: "PN", joined: "Feb 2026" },
  { name: "James Okafor", email: "james@acmecorp.io", role: "Editor", avatar: "JO", joined: "Mar 2026" },
  { name: "Sarah Mitchell", email: "sarah@acmecorp.io", role: "Viewer", avatar: "SM", joined: "Apr 2026" },
];

const pendingInvites = [
  { email: "tom@acmecorp.io", role: "Editor", sent: "Jun 1, 2026" },
];

const apiKeys = [
  { name: "Production Key", key: "nxk_live_8f2a...k9p1", created: "Jan 15, 2026", lastUsed: "2 hours ago", scope: "Full Access" },
  { name: "Analytics Read-only", key: "nxk_live_3c9b...m4x2", created: "Mar 3, 2026", lastUsed: "5 days ago", scope: "Read Only" },
];

const auditLog = [
  { action: "Campaign sent", user: "Ryan Nguyen", detail: "Summer Sale — VIP Segment", time: "Jun 3, 2026 14:32" },
  { action: "Segment created", user: "Priya Nair", detail: "High-value recent buyers", time: "Jun 2, 2026 11:14" },
  { action: "User invited", user: "Ryan Nguyen", detail: "tom@acmecorp.io as Editor", time: "Jun 1, 2026 09:55" },
  { action: "API key generated", user: "Ryan Nguyen", detail: "Analytics Read-only", time: "Mar 3, 2026 15:42" },
  { action: "Integration connected", user: "Ryan Nguyen", detail: "Shopify — acme-corp.myshopify.com", time: "Jan 22, 2026 10:00" },
  { action: "Plan upgraded", user: "Ryan Nguyen", detail: "Starter → Growth", time: "Jan 15, 2026 12:30" },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("org");
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

  const showSave = (label = "Changes saved") => {
    setSaveToast(label);
    setTimeout(() => setSaveToast(null), 2500);
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden" style={{ fontFamily: font, position: "relative" }}>
      {saveToast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, background: "#0F172A", color: "#FFFFFF",
          borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(15,23,42,0.2)", zIndex: 300,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ color: "#34D399" }}>✓</span> {saveToast}
        </div>
      )}
      {/* Settings nav */}
      <div
        className="py-5 px-3 w-full md:w-[200px] md:shrink-0"
        style={{ background: "#FFFFFF", borderBottom: "1px solid var(--border)" }}
      >
        <p style={{ fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.06em", padding: "0 8px 8px" }}>SETTINGS</p>
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full flex items-center gap-2.5 rounded px-2.5 py-2 mb-0.5 transition-colors"
              style={{
                fontSize: 12,
                fontWeight: isActive ? 500 : 400,
                background: isActive ? "#EFF6FF" : "transparent",
                color: isActive ? "#2563EB" : "#64748B",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === "org" && (
          <div className="max-w-lg space-y-6">
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Organization</h2>
              <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Manage your org profile and branding</p>
            </div>
            <div className="rounded-xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              {[
                { label: "Organization Name", value: "Acme Corp" },
                { label: "Slug", value: "acme-corp", hint: "Used in URLs: /o/acme-corp/…" },
                { label: "Industry", value: "E-commerce" },
                { label: "Default From Name", value: "Acme Corp" },
                { label: "Default From Email", value: "hello@acmecorp.io" },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 5 }}>{f.label}</label>
                  <input
                    defaultValue={f.value}
                    style={{ width: "100%", fontSize: 13, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, outline: "none", color: "#0F172A" }}
                  />
                  {f.hint && <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>{f.hint}</p>}
                </div>
              ))}
              <button onClick={() => showSave()} style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: "#2563EB", padding: "8px 20px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: font }}>
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Users & Roles</h2>
                <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Manage team access and permissions</p>
              </div>
              <button
                className="flex items-center gap-1.5 rounded-lg px-3 py-2"
                style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF" }}
              >
                <Plus size={13} />
                Invite Teammate
              </button>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              {teamMembers.map((m, i) => (
                <div
                  key={m.email}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{ borderBottom: i < teamMembers.length - 1 ? "1px solid #F8FAFC" : "none" }}
                >
                  <div
                    className="rounded-full flex items-center justify-center text-white"
                    style={{ width: 36, height: 36, background: `hsl(${m.email.charCodeAt(0) * 30}, 60%, 50%)`, fontSize: 12, fontWeight: 600 }}
                  >
                    {m.avatar}
                  </div>
                  <div className="flex-1">
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{m.name}</p>
                    <p style={{ fontSize: 11, color: "#64748B" }}>{m.email}</p>
                  </div>
                  <select
                    defaultValue={m.role}
                    style={{ fontSize: 12, padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, color: "#0F172A" }}
                  >
                    <option>Super Admin</option>
                    <option>Admin</option>
                    <option>Editor</option>
                    <option>Viewer</option>
                  </select>
                  <span style={{ fontSize: 11, color: "#94A3B8", width: 80 }}>since {m.joined}</span>
                  <button style={{ color: "#EF4444" }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>

            {pendingInvites.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", marginBottom: 8 }}>PENDING INVITES</p>
                {pendingInvites.map((inv) => (
                  <div
                    key={inv.email}
                    className="flex items-center gap-4 px-5 py-4 rounded-xl"
                    style={{ background: "#FFFBEB", border: "1px solid #FEF08A" }}
                  >
                    <AlertCircle size={14} color="#D97706" />
                    <div className="flex-1">
                      <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{inv.email}</p>
                      <p style={{ fontSize: 11, color: "#64748B" }}>Invited as {inv.role} · {inv.sent}</p>
                    </div>
                    <button style={{ fontSize: 11, color: "#2563EB" }}>Resend</button>
                    <button style={{ fontSize: 11, color: "#DC2626" }}>Cancel</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "billing" && (
          <div className="max-w-2xl space-y-6">
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Billing & Subscription</h2>
            <div className="rounded-xl p-6" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <span className="rounded-full px-3 py-1" style={{ fontSize: 12, fontWeight: 700, background: "#7C3AED", color: "#FFFFFF" }}>GROWTH</span>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", marginTop: 8 }}>$299<span style={{ fontSize: 14, color: "#64748B" }}>/mo</span></p>
                </div>
                <button style={{ fontSize: 12, fontWeight: 500, color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 6, padding: "6px 14px", background: "#EFF6FF" }}>
                  Upgrade to Pro
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Contacts", used: 48291, limit: 50000 },
                  { label: "Email sends this month", used: 214550, limit: 500000 },
                ].map((u) => (
                  <div key={u.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 12, color: "#64748B" }}>{u.label}</span>
                      <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#0F172A" }}>
                        {u.used.toLocaleString()} / {u.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 5, background: "#F1F5F9" }}>
                      <div
                        className="rounded-full"
                        style={{ height: "100%", width: `${(u.used / u.limit) * 100}%`, background: u.used / u.limit > 0.9 ? "#EF4444" : "#2563EB" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>API Keys</h2>
                <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Manage programmatic access to your account</p>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF" }}>
                <Plus size={13} />
                Generate Key
              </button>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              {apiKeys.map((k, i) => (
                <div key={k.name} className="px-5 py-4" style={{ borderBottom: i < apiKeys.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{k.name}</p>
                    <div className="flex gap-2">
                      <button style={{ color: "#94A3B8" }}><Copy size={13} /></button>
                      <button style={{ color: "#DC2626" }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <code style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#64748B", background: "#F8FAFC", padding: "3px 8px", borderRadius: 4 }}>
                    {k.key}
                  </code>
                  <div className="flex gap-4 mt-2">
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>Created {k.created}</span>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>Last used {k.lastUsed}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, background: "#F1F5F9", color: "#64748B" }}>{k.scope}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Audit Log</h2>
              <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Chronological record of admin actions</p>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              {auditLog.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 px-5 py-4"
                  style={{ borderBottom: i < auditLog.length - 1 ? "1px solid #F8FAFC" : "none" }}
                >
                  <div className="rounded-full" style={{ width: 8, height: 8, background: "#2563EB", marginTop: 5, flexShrink: 0 }} />
                  <div className="flex-1">
                    <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{entry.action}</p>
                    <p style={{ fontSize: 11, color: "#64748B" }}>{entry.detail}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: 11, color: "#64748B" }}>{entry.user}</p>
                    <p style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{entry.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === "sending" || activeTab === "integrations" || activeTab === "webhooks") && (
          <div className="max-w-2xl space-y-6">
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>
              {settingsTabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <div
              className="rounded-xl flex flex-col items-center justify-center py-16"
              style={{ background: "#FFFFFF", border: "2px dashed #CBD5E1" }}
            >
              <div className="rounded-xl p-4" style={{ background: "#F8FAFC" }}>
                {activeTab === "integrations" && <Plug size={24} color="#94A3B8" />}
                {activeTab === "sending" && <Mail size={24} color="#94A3B8" />}
                {activeTab === "webhooks" && <Webhook size={24} color="#94A3B8" />}
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#64748B", marginTop: 16 }}>
                {activeTab === "integrations" && "Connect your store"}
                {activeTab === "sending" && "Configure sending domains"}
                {activeTab === "webhooks" && "Subscribe to webhooks"}
              </p>
              <button className="mt-4 rounded-lg px-4 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF" }}>
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}