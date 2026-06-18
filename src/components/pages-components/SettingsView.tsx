"use client";

import {
  Building2, Users, CreditCard, Plug, Mail, Key, Webhook, FileText,
  AlertCircle, Plus, Trash2, Copy, CheckCircle2, ShieldCheck,
  UserMinus, Clock, X, ChevronDown, RefreshCw, Send,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCurrentUser } from "@/components/SessionProvider";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

// Fixed role ENUM — mirrors crm_organization_members.role in the DB.
const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "marketing_manager", label: "Marketing Manager" },
  { value: "analyst", label: "Analyst" },
  { value: "read_only", label: "Read Only" },
] as const;
const roleLabel = (r: unknown) => ROLE_OPTIONS.find((o) => o.value === String(r))?.label ?? str(r);
const roleBadgeColors = (r: unknown): { bg: string; fg: string } => {
  switch (String(r)) {
    case "super_admin": return { bg: "#F3E8FF", fg: "#7C3AED" };
    case "admin": return { bg: "#EFF6FF", fg: "#2563EB" };
    case "marketing_manager": return { bg: "#ECFDF5", fg: "#059669" };
    case "analyst": return { bg: "#FEF3C7", fg: "#D97706" };
    default: return { bg: "#F1F5F9", fg: "#64748B" };
  }
};

// Common IANA zones for the org timezone picker (passed through to crm-api).
const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "Europe/Madrid", "Europe/Moscow", "Asia/Dubai", "Asia/Kolkata",
  "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney",
];

// API-key scopes the UI offers at create time (sent in `scopes`, stored in crm_api_keys.scopes_json).
const SCOPE_OPTIONS = [
  { value: "read", label: "Read", hint: "Read customers, campaigns, reports" },
  { value: "write", label: "Write", hint: "Create & update records" },
  { value: "send", label: "Send", hint: "Trigger campaign / transactional sends" },
] as const;

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

// Case-insensitive field accessor (API mixes PascalCase + camelCase).
const get = (o: Record<string, unknown> | null | undefined, key: string): unknown => {
  if (!o) return undefined;
  const k = Object.keys(o).find((x) => x.toLowerCase() === key.toLowerCase());
  return k ? o[k] : undefined;
};
const str = (v: unknown, fallback = "—") => (v == null || v === "" ? fallback : String(v));
const normList = (d: unknown): Record<string, unknown>[] => (Array.isArray(d) ? d : ((d as { rows?: unknown[] })?.rows ?? []) as Record<string, unknown>[]);
const fmtDate = (v: unknown) => { const s = str(v, ""); if (!s) return "—"; const d = new Date(s); return isNaN(+d) ? s : d.toLocaleDateString(); };
const initials = (name: string, email: string) => {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
};

// Normalize the DKIM/SPF/DMARC records the API returns for a domain into a flat
// list of { type, host, value }. Tolerates several shapes since the exact crm-api
// envelope isn't pinned (array under dkimRecords/records/dnsRecords + scalar spf/dmarc).
type DnsRecord = { type: string; host: string; value: string };
const dnsRecords = (detail: Record<string, unknown> | null | undefined): DnsRecord[] => {
  if (!detail) return [];
  const out: DnsRecord[] = [];
  const arr = get(detail, "dnsRecords") ?? get(detail, "records") ?? get(detail, "dkimRecords") ?? get(detail, "dkim");
  if (Array.isArray(arr)) {
    for (const r of arr as Record<string, unknown>[]) {
      out.push({
        type: str(get(r, "type"), "TXT"),
        host: str(get(r, "host") ?? get(r, "name") ?? get(r, "hostname"), "@"),
        value: str(get(r, "value") ?? get(r, "data") ?? get(r, "record") ?? get(r, "target"), ""),
      });
    }
  }
  const spf = get(detail, "spfRecord") ?? get(detail, "spf");
  if (typeof spf === "string" && spf) out.push({ type: "TXT", host: "@", value: spf });
  const dmarc = get(detail, "dmarcRecord") ?? get(detail, "dmarc");
  if (typeof dmarc === "string" && dmarc) out.push({ type: "TXT", host: "_dmarc", value: dmarc });
  return out;
};

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("org");
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const showSave = (label = "Changes saved") => { setSaveToast(label); setTimeout(() => setSaveToast(null), 2500); };

  // Current user — owner-only mutations are gated on super_admin.
  const { user: currentUser } = useCurrentUser();
  const isOwner = currentUser?.role === "super_admin";

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
      if (d.ok) { setInviteOpen(false); setInviteEmail(""); showSave(`Invite sent to ${email}`); loadMembers(); }
      else setInviteError(d.error || "Failed to send invite.");
    } catch { setInviteError("Could not send invite."); }
    finally { setInviteBusy(false); }
  };

  // ── Organization ──
  const [org, setOrg] = useState<Record<string, unknown> | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgBilling, setOrgBilling] = useState("");
  const [orgTz, setOrgTz] = useState("UTC");
  const [orgBusy, setOrgBusy] = useState(false);
  const saveOrg = async () => {
    setOrgBusy(true);
    const res = await fetch("/api/settings/org", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: orgName, billingEmail: orgBilling, timeZone: orgTz }) });
    setOrgBusy(false);
    if (res.ok) showSave("Organization updated"); else showSave("Failed to save");
  };

  // ── Members & invites (Users & Roles tab) ──
  const [members, setMembers] = useState<Record<string, unknown>[]>([]);
  const [invites, setInvites] = useState<Record<string, unknown>[]>([]);
  const [memberBusy, setMemberBusy] = useState<string | null>(null); // id currently mutating
  const memberId = (m: Record<string, unknown>) => str(get(m, "userId") ?? get(m, "id") ?? get(m, "user_id"), "");

  const loadMembers = useCallback(async () => {
    const [m, inv] = await Promise.all([
      fetch("/api/me/org/members").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/team/invites").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    setMembers(normList(m));
    setInvites(normList(inv));
  }, []);

  const changeRole = async (m: Record<string, unknown>, role: string) => {
    const id = memberId(m);
    if (!id || role === str(get(m, "role"), "")) return;
    setMemberBusy(id);
    const res = await fetch(`/api/me/org/members/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    setMemberBusy(null);
    if (res.ok) { showSave(`Role updated to ${roleLabel(role)}`); loadMembers(); }
    else { const d = await res.json().catch(() => ({})); showSave(d.error || "Failed to update role"); }
  };

  const removeMember = async (m: Record<string, unknown>) => {
    const id = memberId(m);
    const who = str(get(m, "name") ?? get(m, "displayName") ?? get(m, "email"), "this member");
    if (!id || !confirm(`Remove ${who} from the organization? They will lose access immediately.`)) return;
    setMemberBusy(id);
    const res = await fetch(`/api/me/org/members/${id}`, { method: "DELETE" });
    setMemberBusy(null);
    if (res.ok) { showSave("Member removed"); loadMembers(); }
    else { const d = await res.json().catch(() => ({})); showSave(d.error || "Failed to remove member"); }
  };

  const revokeInvite = async (inv: Record<string, unknown>) => {
    const id = str(get(inv, "id") ?? get(inv, "inviteId"), "");
    if (!id || !confirm("Revoke this pending invite?")) return;
    setMemberBusy(id);
    const res = await fetch(`/api/team/invites/${id}`, { method: "DELETE" });
    setMemberBusy(null);
    if (res.ok) { showSave("Invite revoked"); loadMembers(); }
    else { const d = await res.json().catch(() => ({})); showSave(d.error || "Failed to revoke invite"); }
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
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read", "write"]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [newProvider, setNewProvider] = useState("shopify");
  const [newProviderLabel, setNewProviderLabel] = useState("");
  const [newHookUrl, setNewHookUrl] = useState("");
  const [newHookEvents, setNewHookEvents] = useState("");

  // Sending-domain DNS records (DKIM/SPF/DMARC) — fetched per domain via GET .../sending-domains/{id}.
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [domainDetail, setDomainDetail] = useState<Record<string, Record<string, unknown> | null>>({});
  const [domainBusy, setDomainBusy] = useState<string | null>(null); // id loading detail or re-checking
  const [hookBusy, setHookBusy] = useState<string | null>(null); // id currently test-firing

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
      if (d) { setOrg(d); setOrgName(str(get(d, "name"), "")); setOrgBilling(str(get(d, "billingEmail"), "")); setOrgTz(str(get(d, "timeZone") ?? get(d, "timezone"), "UTC")); }
      return;
    }
    if (tab === "users") {
      setLoading(true);
      await loadMembers();
      setLoading(false);
      return;
    }
    const cfg = map[tab];
    if (!cfg) return;
    setLoading(true);
    const d = await fetch(`/api/settings/${cfg.path}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setLoading(false);
    cfg.set(normList(d));
  }, [loadMembers]);

  useEffect(() => { load(activeTab); }, [activeTab, load]);

  const del = async (path: string, id: unknown, after: () => void) => {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/settings/${path}/${id}`, { method: "DELETE" });
    if (res.ok) { showSave("Deleted"); after(); } else showSave("Delete failed");
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    if (newKeyScopes.length === 0) { showSave("Pick at least one scope"); return; }
    const res = await fetch("/api/settings/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newKeyName.trim(), scopes: newKeyScopes }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      const secret = get(d, "key") ?? get(d, "token") ?? get(d, "plaintext") ?? get(d, "secret");
      if (secret) setRevealedKey(String(secret));
      setNewKeyName(""); setNewKeyScopes(["read", "write"]); showSave("API key created"); load("api");
    } else showSave("Failed to create key");
  };
  const toggleScope = (s: string) => setNewKeyScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const addDomain = async () => {
    if (!newDomain.trim()) return;
    const res = await fetch("/api/settings/sending-domains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: newDomain.trim() }) });
    if (res.ok) { setNewDomain(""); showSave("Domain added"); load("sending"); } else showSave("Failed to add domain");
  };
  // Fetch the per-domain DNS records (DKIM/SPF/DMARC) the user must publish, and toggle the panel.
  const toggleDomain = async (id: unknown) => {
    const key = str(id, "");
    if (!key) return;
    if (expandedDomain === key) { setExpandedDomain(null); return; }
    setExpandedDomain(key);
    if (!domainDetail[key]) {
      setDomainBusy(key);
      const d = await fetch(`/api/settings/sending-domains/${key}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      setDomainBusy(null);
      setDomainDetail((prev) => ({ ...prev, [key]: (d as Record<string, unknown>) ?? null }));
    }
  };
  const verifyDomain = async (id: unknown) => {
    const key = str(id, "");
    setDomainBusy(key);
    const res = await fetch(`/api/settings/sending-domains/${key}/verify`, { method: "POST" });
    setDomainBusy(null);
    if (res.ok) {
      showSave("Re-check requested");
      // Refresh the cached DNS/status detail if its panel is open, then the list.
      if (expandedDomain === key) {
        const d = await fetch(`/api/settings/sending-domains/${key}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        setDomainDetail((prev) => ({ ...prev, [key]: (d as Record<string, unknown>) ?? null }));
      }
      load("sending");
    } else showSave("Verify failed");
  };
  const testHook = async (id: unknown) => {
    const key = str(id, "");
    if (!key) return;
    setHookBusy(key);
    const res = await fetch(`/api/settings/webhooks/${key}/test`, { method: "POST" });
    setHookBusy(null);
    if (res.ok) showSave("Test event sent"); else showSave("Test delivery failed");
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
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 5 }}>Timezone</label>
                <select value={orgTz} onChange={(e) => setOrgTz(e.target.value)} style={{ ...inputStyle, background: "#FFFFFF" }}>
                  {(TIMEZONES.includes(orgTz) ? TIMEZONES : [orgTz, ...TIMEZONES]).map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Used for scheduling and timestamps shown across the org.</p>
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
              {isOwner && (
                <button onClick={() => { setInviteError(null); setInviteOpen(true); }} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
                  <Plus size={13} /> Invite Teammate
                </button>
              )}
            </div>

            {/* Active members */}
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              {loading ? <p style={{ fontSize: 12, color: "#94A3B8", padding: 20 }}>Loading…</p>
                : members.length === 0 ? <EmptyState compact icon={Users} title="No members yet" description="Invite a teammate to get started." />
                : members.map((m, i) => {
                  const email = str(get(m, "email"), "");
                  const name = str(get(m, "name") ?? get(m, "displayName"), email);
                  const role = str(get(m, "role"), "read_only");
                  const id = memberId(m);
                  const isSelf = !!currentUser?.email && email.toLowerCase() === currentUser.email.toLowerCase();
                  const busy = memberBusy === id;
                  const badge = roleBadgeColors(role);
                  return (
                    <div key={id || email || i} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: i < members.length - 1 ? "1px solid #F8FAFC" : "none", opacity: busy ? 0.5 : 1 }}>
                      <div className="rounded-full flex items-center justify-center text-white" style={{ width: 36, height: 36, background: `hsl(${(email.charCodeAt(0) || 65) * 30}, 60%, 50%)`, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{initials(name, email)}</div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{name}{isSelf && <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 400 }}> (you)</span>}</p>
                        <p className="truncate" style={{ fontSize: 11, color: "#64748B" }}>{email}</p>
                      </div>
                      <span style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap" }}>since {fmtDate(get(m, "joinedAt") ?? get(m, "joined_at") ?? get(m, "createdAt"))}</span>
                      {isOwner && !isSelf ? (
                        <select value={role} disabled={busy} onChange={(e) => changeRole(m, e.target.value)}
                          style={{ fontSize: 11, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "#FFFFFF", color: "#0F172A", cursor: busy ? "not-allowed" : "pointer" }}>
                          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : (
                        <span className="rounded-full px-2 py-0.5" style={{ fontSize: 11, fontWeight: 500, background: badge.bg, color: badge.fg, whiteSpace: "nowrap" }}>{roleLabel(role)}</span>
                      )}
                      {isOwner && !isSelf && (
                        <button onClick={() => removeMember(m)} disabled={busy} title="Remove member" style={{ color: "#DC2626", cursor: busy ? "not-allowed" : "pointer" }}><UserMinus size={14} /></button>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Pending invites */}
            {invites.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>Pending invites</p>
                <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
                  {invites.map((inv, i) => {
                    const email = str(get(inv, "email"));
                    const role = str(get(inv, "role"), "");
                    const id = str(get(inv, "id") ?? get(inv, "inviteId"), "");
                    const busy = memberBusy === id;
                    return (
                      <div key={id || email || i} className="flex items-center gap-4 px-5 py-3.5" style={{ borderBottom: i < invites.length - 1 ? "1px solid #F8FAFC" : "none", opacity: busy ? 0.5 : 1 }}>
                        <Clock size={15} color="#D97706" style={{ flexShrink: 0 }} />
                        <div className="flex-1 min-w-0"><p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{email}</p>
                          <p style={{ fontSize: 11, color: "#94A3B8" }}>Invited {fmtDate(get(inv, "createdAt") ?? get(inv, "invitedAt"))}{get(inv, "expiresAt") ? ` · expires ${fmtDate(get(inv, "expiresAt"))}` : ""}</p></div>
                        {role && <span className="rounded-full px-2 py-0.5" style={{ fontSize: 11, background: "#FFFBEB", color: "#D97706", whiteSpace: "nowrap" }}>{roleLabel(role)}</span>}
                        {isOwner && id && (
                          <button onClick={() => revokeInvite(inv)} disabled={busy} title="Revoke invite" style={{ color: "#DC2626", cursor: busy ? "not-allowed" : "pointer" }}><X size={15} /></button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isOwner && <p style={{ fontSize: 11, color: "#94A3B8" }}>Only organization owners (Super Admin) can invite, change roles, or remove members.</p>}
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
            <div className="rounded-xl p-4 space-y-3" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <div className="flex items-end gap-3">
                <div className="flex-1"><label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 5 }}>New key name</label>
                  <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Production server" style={inputStyle} /></div>
                <button onClick={createKey} className="flex items-center gap-1.5" style={primaryBtn}><Plus size={13} /> Generate</button>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 6 }}>Scopes</label>
                <div className="flex flex-wrap gap-2">
                  {SCOPE_OPTIONS.map((s) => {
                    const on = newKeyScopes.includes(s.value);
                    return (
                      <button key={s.value} type="button" onClick={() => toggleScope(s.value)} title={s.hint}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                        style={{ fontSize: 12, fontWeight: 500, border: `1px solid ${on ? "#2563EB" : "var(--border)"}`, background: on ? "#EFF6FF" : "#FFFFFF", color: on ? "#2563EB" : "#64748B", cursor: "pointer" }}>
                        {on ? <CheckCircle2 size={12} /> : <Plus size={12} />}{s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
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
                    {(() => { const sc = get(k, "scopes"); const list = Array.isArray(sc) ? sc.map(String) : []; return list.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {list.map((s) => <span key={s} className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 600, background: "#EFF6FF", color: "#2563EB" }}>{s}</span>)}
                      </div>
                    ) : null; })()}
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
                  const id = str(get(d, "id"), "");
                  const open = expandedDomain === id;
                  const busy = domainBusy === id;
                  const detail = domainDetail[id];
                  const records = dnsRecords(detail);
                  return (
                    <div key={id || i} style={{ borderBottom: i < domains.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                      <div className="flex items-center gap-3 px-5 py-4">
                        <Mail size={14} color="#64748B" />
                        <p className="flex-1" style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", fontFamily: "monospace" }}>{str(get(d, "domain"))}</p>
                        <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 600, background: verified ? "#F0FDF4" : "#FFFBEB", color: verified ? "#16A34A" : "#D97706" }}>
                          {verified ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}{verified ? "Verified" : "Pending"}
                        </span>
                        <button onClick={() => toggleDomain(get(d, "id"))} className="flex items-center gap-1" style={{ fontSize: 11, color: "#2563EB", fontWeight: 500 }}>
                          DNS records <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                        </button>
                        <button onClick={() => verifyDomain(get(d, "id"))} disabled={busy} title="Re-check DNS" className="flex items-center gap-1" style={{ fontSize: 11, color: "#2563EB", fontWeight: 500, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1 }}>
                          <RefreshCw size={12} className={busy ? "animate-spin" : undefined} />{verified ? "Re-check" : "Verify"}
                        </button>
                        <button onClick={() => del("sending-domains", get(d, "id"), () => load("sending"))} style={{ color: "#DC2626" }}><Trash2 size={13} /></button>
                      </div>
                      {open && (
                        <div className="px-5 pb-4" style={{ background: "#F8FAFC" }}>
                          {busy && !detail ? (
                            <p style={{ fontSize: 12, color: "#94A3B8", padding: "12px 0" }}>Loading DNS records…</p>
                          ) : records.length === 0 ? (
                            <p style={{ fontSize: 12, color: "#94A3B8", padding: "12px 0" }}>No DNS records returned for this domain yet.</p>
                          ) : (
                            <div className="pt-3">
                              <p style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>Add these records at your DNS provider, then click Re-check.</p>
                              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)", background: "#FFFFFF" }}>
                                <div className="grid px-3 py-2" style={{ gridTemplateColumns: "60px 1.2fr 2fr 28px", gap: 8, fontSize: 10, fontWeight: 600, color: "#94A3B8", background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
                                  <span>TYPE</span><span>HOST</span><span>VALUE</span><span />
                                </div>
                                {records.map((r, ri) => (
                                  <div key={ri} className="grid items-center px-3 py-2" style={{ gridTemplateColumns: "60px 1.2fr 2fr 28px", gap: 8, borderBottom: ri < records.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#0F172A" }}>{r.type}</span>
                                    <code style={{ fontSize: 11, fontFamily: "monospace", color: "#0F172A", wordBreak: "break-all" }}>{r.host}</code>
                                    <code style={{ fontSize: 11, fontFamily: "monospace", color: "#64748B", wordBreak: "break-all" }}>{r.value}</code>
                                    <button onClick={() => navigator.clipboard?.writeText(r.value)} title="Copy value" style={{ color: "#2563EB" }}><Copy size={12} /></button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
                : hooks.map((h, i) => {
                  const id = str(get(h, "id"), "");
                  const busy = hookBusy === id;
                  const status = str(get(h, "status"), "").toLowerCase();
                  const statusColor = status === "active" ? { bg: "#F0FDF4", fg: "#16A34A" } : status === "failing" ? { bg: "#FEF2F2", fg: "#DC2626" } : status === "paused" ? { bg: "#F1F5F9", fg: "#64748B" } : null;
                  return (
                  <div key={id || i} className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: i < hooks.length - 1 ? "1px solid #F8FAFC" : "none", opacity: busy ? 0.6 : 1 }}>
                    <Webhook size={14} color="#64748B" />
                    <div className="flex-1 min-w-0"><p className="truncate" style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", fontFamily: "monospace" }}>{str(get(h, "url"))}</p>
                      <p style={{ fontSize: 11, color: "#64748B" }}>{(() => { const ev = get(h, "events") ?? get(h, "eventsSubscribed"); return Array.isArray(ev) ? ev.join(", ") : str(ev, "all events"); })()}</p></div>
                    {statusColor && <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 600, background: statusColor.bg, color: statusColor.fg, textTransform: "capitalize" }}>{status}</span>}
                    <button onClick={() => testHook(get(h, "id"))} disabled={busy} title="Send a test event" className="flex items-center gap-1" style={{ fontSize: 11, color: "#2563EB", fontWeight: 500, cursor: busy ? "not-allowed" : "pointer" }}>
                      <Send size={12} />{busy ? "Sending…" : "Test"}
                    </button>
                    <button onClick={() => del("webhooks", get(h, "id"), () => load("webhooks"))} style={{ color: "#DC2626" }}><Trash2 size={13} /></button>
                  </div>
                  );
                })}
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
