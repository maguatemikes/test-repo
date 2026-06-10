"use client";

import {
  Building2, Users, CreditCard, Plug, Mail, Key, Webhook, FileText,
  AlertCircle, Plus, Trash2, Copy, CheckCircle2, ShieldCheck,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

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
];

// Case-insensitive field accessor (API mixes PascalCase + camelCase).
const get = (o: Record<string, unknown> | null | undefined, key: string): unknown => {
  if (!o) return undefined;
  const k = Object.keys(o).find((x) => x.toLowerCase() === key.toLowerCase());
  return k ? o[k] : undefined;
};
const str = (v: unknown, fallback = "—") => (v == null || v === "" ? fallback : String(v));
const normList = (d: unknown): Record<string, unknown>[] => (Array.isArray(d) ? d : ((d as { rows?: unknown[] })?.rows ?? []) as Record<string, unknown>[]);
const fmtDate = (v: unknown) => { const s = str(v, ""); if (!s) return "—"; const d = new Date(s); return isNaN(+d) ? s : d.toLocaleDateString(); };

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("org");
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const showSave = (label = "Changes saved") => { setSaveToast(label); setTimeout(() => setSaveToast(null), 2500); };

  // ── Invite teammate (already wired → crm-api) ──
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("marketing_manager");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const sendInvite = async () => {
    setInviteError(null);
    const email = inviteEmail.trim();
    if (!email.includes("@")) { setInviteError("Enter a valid email address."); return; }
    setInviteBusy(true);
    try {
      const res = await fetch("/api/team/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role: inviteRole }) });
      const d = await res.json();
      if (d.ok) { setInviteOpen(false); setInviteEmail(""); showSave(`Invite sent to ${email}`); }
      else setInviteError(d.error || "Failed to send invite.");
    } catch { setInviteError("Could not send invite."); }
    finally { setInviteBusy(false); }
  };

  // ── Organization ──
  const [org, setOrg] = useState<Record<string, unknown> | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgBilling, setOrgBilling] = useState("");
  const [orgBusy, setOrgBusy] = useState(false);
  const saveOrg = async () => {
    setOrgBusy(true);
    const res = await fetch("/api/settings/org", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: orgName, billingEmail: orgBilling }) });
    setOrgBusy(false);
    if (res.ok) showSave("Organization updated"); else showSave("Failed to save");
  };

  // ── Generic resource lists ──
  const [keys, setKeys] = useState<Record<string, unknown>[]>([]);
  const [audit, setAudit] = useState<Record<string, unknown>[]>([]);
  const [domains, setDomains] = useState<Record<string, unknown>[]>([]);
  const [integrations, setIntegrations] = useState<Record<string, unknown>[]>([]);
  const [hooks, setHooks] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  // New-resource form inputs
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [newProvider, setNewProvider] = useState("shopify");
  const [newProviderLabel, setNewProviderLabel] = useState("");
  const [newHookUrl, setNewHookUrl] = useState("");
  const [newHookEvents, setNewHookEvents] = useState("");

  const load = useCallback(async (tab: string) => {
    const map: Record<string, { path: string; set: (v: Record<string, unknown>[]) => void }> = {
      api: { path: "api-keys", set: setKeys },
      audit: { path: "audit-logs", set: setAudit },
      sending: { path: "sending-domains", set: setDomains },
      integrations: { path: "integrations", set: setIntegrations },
      webhooks: { path: "webhooks", set: setHooks },
    };
    if (tab === "org") {
      setLoading(true);
      const d = await fetch("/api/settings/org").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      setLoading(false);
      if (d) { setOrg(d); setOrgName(str(get(d, "name"), "")); setOrgBilling(str(get(d, "billingEmail"), "")); }
      return;
    }
    const cfg = map[tab];
    if (!cfg) return;
    setLoading(true);
    const d = await fetch(`/api/settings/${cfg.path}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setLoading(false);
    cfg.set(normList(d));
  }, []);

  useEffect(() => { load(activeTab); }, [activeTab, load]);

  const del = async (path: string, id: unknown, after: () => void) => {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/settings/${path}/${id}`, { method: "DELETE" });
    if (res.ok) { showSave("Deleted"); after(); } else showSave("Delete failed");
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    const res = await fetch("/api/settings/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newKeyName.trim(), scopes: ["read", "write"] }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      const secret = get(d, "key") ?? get(d, "token") ?? get(d, "plaintext") ?? get(d, "secret");
      if (secret) setRevealedKey(String(secret));
      setNewKeyName(""); showSave("API key created"); load("api");
    } else showSave("Failed to create key");
  };
  const addDomain = async () => {
    if (!newDomain.trim()) return;
    const res = await fetch("/api/settings/sending-domains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: newDomain.trim() }) });
    if (res.ok) { setNewDomain(""); showSave("Domain added"); load("sending"); } else showSave("Failed to add domain");
  };
  const verifyDomain = async (id: unknown) => {
    const res = await fetch(`/api/settings/sending-domains/${id}/verify`, { method: "POST" });
    if (res.ok) { showSave("Verification requested"); load("sending"); } else showSave("Verify failed");
  };
  const addIntegration = async () => {
    if (!newProviderLabel.trim()) return;
    const res = await fetch("/api/settings/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: newProvider, accountLabel: newProviderLabel.trim() }) });
    if (res.ok) { setNewProviderLabel(""); showSave("Integration connected"); load("integrations"); } else showSave("Failed to connect");
  };
  const addHook = async () => {
    if (!newHookUrl.trim()) return;
    const events = newHookEvents.split(",").map((e) => e.trim()).filter(Boolean);
    const res = await fetch("/api/settings/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: newHookUrl.trim(), events: events.length ? events : ["*"] }) });
    if (res.ok) { setNewHookUrl(""); setNewHookEvents(""); showSave("Webhook added"); load("webhooks"); } else showSave("Failed to add webhook");
  };

  const inputStyle = { width: "100%", fontSize: 13, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, outline: "none", color: "#0F172A" } as const;
  const primaryBtn = { fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: "#2563EB", padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: font } as const;
  const H = ({ t, s }: { t: string; s?: string }) => (
    <div><h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{t}</h2>{s && <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{s}</p>}</div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden" style={{ fontFamily: font, position: "relative" }}>
      {saveToast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0F172A", color: "#FFFFFF", borderRadius: 8, padding: "10px 18px", fontSize: 12, fontWeight: 500, boxShadow: "0 4px 16px rgba(15,23,42,0.2)", zIndex: 300, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#34D399" }}>✓</span> {saveToast}
        </div>
      )}

      {inviteOpen && (
        <div onClick={() => setInviteOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 12, padding: 24, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", fontFamily: font }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Invite teammate</h3>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>They&#39;ll receive an email with a link to join. The invite expires in 7 days.</p>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 6 }}>Email</label>
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@company.com" autoFocus style={inputStyle} />
            <label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", margin: "12px 0 6px" }}>Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ ...inputStyle, background: "#FFFFFF" }}>
              <option value="admin">Admin</option>
              <option value="marketing_manager">Marketing Manager</option>
              <option value="analyst">Analyst</option>
              <option value="read_only">Read Only</option>
              <option value="super_admin">Super Admin</option>
            </select>
            {inviteError && <p style={{ fontSize: 12, color: "#DC2626", marginTop: 10 }}>{inviteError}</p>}
            <div className="flex justify-end gap-2" style={{ marginTop: 18 }}>
              <button onClick={() => setInviteOpen(false)} style={{ fontSize: 12, fontWeight: 500, color: "#64748B", background: "#FFFFFF", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 14px", cursor: "pointer" }}>Cancel</button>
              <button onClick={sendInvite} disabled={inviteBusy} style={{ ...primaryBtn, background: inviteBusy ? "#94A3B8" : "#2563EB", cursor: inviteBusy ? "not-allowed" : "pointer" }}>{inviteBusy ? "Sending…" : "Send invite"}</button>
            </div>
          </div>
        </div>
      )}

      {revealedKey && (
        <div onClick={() => setRevealedKey(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 12, padding: 24, width: 460, maxWidth: "90vw", fontFamily: font }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Copy your API key</h3>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>This is the only time it&#39;s shown in full. Store it somewhere safe.</p>
            <div className="flex items-center gap-2 rounded-lg p-3" style={{ background: "#F8FAFC", border: "1px solid var(--border)" }}>
              <code style={{ fontSize: 12, fontFamily: "monospace", color: "#0F172A", flex: 1, wordBreak: "break-all" }}>{revealedKey}</code>
              <button onClick={() => navigator.clipboard?.writeText(revealedKey)} style={{ color: "#2563EB" }} title="Copy"><Copy size={14} /></button>
            </div>
            <div className="flex justify-end mt-4"><button onClick={() => setRevealedKey(null)} style={primaryBtn}>Done</button></div>
          </div>
        </div>
      )}

      {/* Settings nav */}
      <div className="py-5 px-3 w-full md:w-[200px] md:shrink-0" style={{ background: "#FFFFFF", borderBottom: "1px solid var(--border)" }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.06em", padding: "0 8px 8px" }}>SETTINGS</p>
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="w-full flex items-center gap-2.5 rounded px-2.5 py-2 mb-0.5 transition-colors"
              style={{ fontSize: 12, fontWeight: isActive ? 500 : 400, background: isActive ? "#EFF6FF" : "transparent", color: isActive ? "#2563EB" : "#64748B" }}>
              <Icon size={14} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === "org" && (
          <div className="max-w-lg space-y-6">
            <H t="Organization" s="Manage your org profile and billing contact" />
            <div className="rounded-xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 5 }}>Organization Name</label>
                <input value={orgName} onChange={(e) => setOrgName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 5 }}>Billing Email</label>
                <input value={orgBilling} onChange={(e) => setOrgBilling(e.target.value)} placeholder="billing@company.com" style={inputStyle} />
              </div>
              <div className="flex gap-6">
                <div><p style={{ fontSize: 11, color: "#94A3B8" }}>Slug</p><p style={{ fontSize: 13, color: "#0F172A", fontFamily: "monospace" }}>{str(get(org, "slug"))}</p></div>
                <div><p style={{ fontSize: 11, color: "#94A3B8" }}>Status</p><span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 600, background: "#F0FDF4", color: "#16A34A" }}>{str(get(org, "status")).toUpperCase()}</span></div>
              </div>
              <button onClick={saveOrg} disabled={orgBusy || loading} style={{ ...primaryBtn, opacity: orgBusy ? 0.6 : 1 }}>{orgBusy ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <H t="Users & Roles" s="Manage team access and permissions" />
              <button onClick={() => { setInviteError(null); setInviteOpen(true); }} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
                <Plus size={13} /> Invite Teammate
              </button>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              {teamMembers.map((m, i) => (
                <div key={m.email} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: i < teamMembers.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                  <div className="rounded-full flex items-center justify-center text-white" style={{ width: 36, height: 36, background: `hsl(${m.email.charCodeAt(0) * 30}, 60%, 50%)`, fontSize: 12, fontWeight: 600 }}>{m.avatar}</div>
                  <div className="flex-1"><p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{m.name}</p><p style={{ fontSize: 11, color: "#64748B" }}>{m.email}</p></div>
                  <span className="rounded-full px-2 py-0.5" style={{ fontSize: 11, background: "#F1F5F9", color: "#64748B" }}>{m.role}</span>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>since {m.joined}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#94A3B8" }}>Team roster is read-only here for now; invites are sent through crm-api.</p>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="max-w-2xl space-y-6">
            <H t="Billing & Subscription" s="Plan and usage" />
            <div className="rounded-xl p-6" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full px-3 py-1" style={{ fontSize: 12, fontWeight: 700, background: "#7C3AED", color: "#FFFFFF" }}>PLAN {str(get(org, "planId"), "—")}</span>
                  <p style={{ fontSize: 13, color: "#64748B", marginTop: 10 }}>Billing is managed by NetX. Contact your account manager to change plans.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <H t="API Keys" s="Programmatic access to your account" />
            </div>
            <div className="rounded-xl p-4 flex items-end gap-3" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div className="flex-1"><label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 5 }}>New key name</label>
                <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Production server" style={inputStyle} /></div>
              <button onClick={createKey} className="flex items-center gap-1.5" style={primaryBtn}><Plus size={13} /> Generate</button>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              {loading ? <p style={{ fontSize: 12, color: "#94A3B8", padding: 20 }}>Loading…</p>
                : keys.length === 0 ? <EmptyState compact icon={Key} title="No API keys" description="Generate a key to access the API programmatically." />
                : keys.map((k, i) => (
                  <div key={i} className="px-5 py-4" style={{ borderBottom: i < keys.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                    <div className="flex items-center justify-between mb-1">
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{str(get(k, "name"))}</p>
                      <button onClick={() => del("api-keys", get(k, "id"), () => load("api"))} style={{ color: "#DC2626" }}><Trash2 size={13} /></button>
                    </div>
                    <code style={{ fontSize: 12, fontFamily: "monospace", color: "#64748B", background: "#F8FAFC", padding: "3px 8px", borderRadius: 4 }}>{str(get(k, "prefix") ?? get(k, "maskedKey"), "nxk_…")}</code>
                    <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>Created {fmtDate(get(k, "createdAt"))}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === "sending" && (
          <div className="max-w-2xl space-y-6">
            <H t="Sending Domains" s="Authenticate domains to send email" />
            <div className="rounded-xl p-4 flex items-end gap-3" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div className="flex-1"><label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 5 }}>Domain</label>
                <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="mail.yourbrand.com" style={inputStyle} /></div>
              <button onClick={addDomain} className="flex items-center gap-1.5" style={primaryBtn}><Plus size={13} /> Add</button>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              {loading ? <p style={{ fontSize: 12, color: "#94A3B8", padding: 20 }}>Loading…</p>
                : domains.length === 0 ? <EmptyState compact icon={Mail} title="No sending domains" description="Add a domain and verify it to start sending." />
                : domains.map((d, i) => {
                  const verified = !!(get(d, "verified") ?? (str(get(d, "status")).toLowerCase() === "verified"));
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: i < domains.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                      <Mail size={14} color="#64748B" />
                      <p className="flex-1" style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", fontFamily: "monospace" }}>{str(get(d, "domain"))}</p>
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 600, background: verified ? "#F0FDF4" : "#FFFBEB", color: verified ? "#16A34A" : "#D97706" }}>
                        {verified ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}{verified ? "Verified" : "Pending"}
                      </span>
                      {!verified && <button onClick={() => verifyDomain(get(d, "id"))} style={{ fontSize: 11, color: "#2563EB", fontWeight: 500 }}>Verify</button>}
                      <button onClick={() => del("sending-domains", get(d, "id"), () => load("sending"))} style={{ color: "#DC2626" }}><Trash2 size={13} /></button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {activeTab === "integrations" && (
          <div className="max-w-2xl space-y-6">
            <H t="Integrations" s="Connect your store and tools" />
            <div className="rounded-xl p-4 flex items-end gap-3" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div><label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 5 }}>Provider</label>
                <select value={newProvider} onChange={(e) => setNewProvider(e.target.value)} style={{ ...inputStyle, width: 160, background: "#FFFFFF" }}>
                  <option value="shopify">Shopify</option><option value="woocommerce">WooCommerce</option><option value="ebay">eBay</option><option value="bigcommerce">BigCommerce</option>
                </select></div>
              <div className="flex-1"><label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 5 }}>Account label</label>
                <input value={newProviderLabel} onChange={(e) => setNewProviderLabel(e.target.value)} placeholder="acme-corp.myshopify.com" style={inputStyle} /></div>
              <button onClick={addIntegration} className="flex items-center gap-1.5" style={primaryBtn}><Plug size={13} /> Connect</button>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              {loading ? <p style={{ fontSize: 12, color: "#94A3B8", padding: 20 }}>Loading…</p>
                : integrations.length === 0 ? <EmptyState compact icon={Plug} title="No integrations" description="Connect a store to sync customers and orders." />
                : integrations.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: i < integrations.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                    <Plug size={14} color="#64748B" />
                    <div className="flex-1"><p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", textTransform: "capitalize" }}>{str(get(it, "provider"))}</p><p style={{ fontSize: 11, color: "#64748B" }}>{str(get(it, "accountLabel"))}</p></div>
                    <button onClick={() => del("integrations", get(it, "id"), () => load("integrations"))} style={{ color: "#DC2626" }}><Trash2 size={13} /></button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === "webhooks" && (
          <div className="max-w-2xl space-y-6">
            <H t="Webhooks" s="Receive event notifications at your endpoint" />
            <div className="rounded-xl p-4 space-y-3" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div><label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 5 }}>Endpoint URL</label>
                <input value={newHookUrl} onChange={(e) => setNewHookUrl(e.target.value)} placeholder="https://example.com/webhooks/netx" style={inputStyle} /></div>
              <div className="flex items-end gap-3">
                <div className="flex-1"><label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 5 }}>Events (comma-separated, blank = all)</label>
                  <input value={newHookEvents} onChange={(e) => setNewHookEvents(e.target.value)} placeholder="customer.created, order.paid" style={inputStyle} /></div>
                <button onClick={addHook} className="flex items-center gap-1.5" style={primaryBtn}><Plus size={13} /> Add</button>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              {loading ? <p style={{ fontSize: 12, color: "#94A3B8", padding: 20 }}>Loading…</p>
                : hooks.length === 0 ? <EmptyState compact icon={Webhook} title="No webhooks" description="Add an endpoint to receive event notifications." />
                : hooks.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: i < hooks.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                    <Webhook size={14} color="#64748B" />
                    <div className="flex-1 min-w-0"><p className="truncate" style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", fontFamily: "monospace" }}>{str(get(h, "url"))}</p>
                      <p style={{ fontSize: 11, color: "#64748B" }}>{(() => { const ev = get(h, "events"); return Array.isArray(ev) ? ev.join(", ") : str(ev, "all events"); })()}</p></div>
                    <button onClick={() => del("webhooks", get(h, "id"), () => load("webhooks"))} style={{ color: "#DC2626" }}><Trash2 size={13} /></button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="max-w-2xl space-y-5">
            <H t="Audit Log" s="Chronological record of admin actions" />
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              {loading ? <p style={{ fontSize: 12, color: "#94A3B8", padding: 20 }}>Loading…</p>
                : audit.length === 0 ? <EmptyState compact icon={ShieldCheck} title="No activity yet" description="Admin actions will appear here as they happen." />
                : audit.map((e, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-4" style={{ borderBottom: i < audit.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                    <div className="rounded-full" style={{ width: 8, height: 8, background: "#2563EB", marginTop: 5, flexShrink: 0 }} />
                    <div className="flex-1"><p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{str(get(e, "action") ?? get(e, "event"))}</p><p style={{ fontSize: 11, color: "#64748B" }}>{str(get(e, "detail") ?? get(e, "description"), "")}</p></div>
                    <div className="text-right"><p style={{ fontSize: 11, color: "#64748B" }}>{str(get(e, "actorEmail") ?? get(e, "user") ?? get(e, "actor"), "")}</p><p style={{ fontSize: 10, color: "#94A3B8", fontFamily: "monospace" }}>{fmtDate(get(e, "createdAt") ?? get(e, "time"))}</p></div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
