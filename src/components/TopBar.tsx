import { Search, Bell, ChevronDown, Plus, X, CheckCircle2, AlertCircle, Info, User, Settings, LogOut, HelpCircle, Menu } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const navTitles: Record<string, string> = {
  dashboard: "Dashboard", customers: "Customers", campaigns: "Campaigns",
  automations: "Automations", forms: "Forms", analytics: "Analytics", settings: "Settings",
};

const primaryActions: Record<string, string> = {
  dashboard: "Compose Campaign", customers: "Import CSV", campaigns: "New Campaign",
  automations: "New Automation", forms: "New Form", analytics: "", settings: "Invite User",
};

const notifications = [
  { id: 1, type: "success", title: "Campaign sent successfully", body: "Summer Sale VIP reached 4,210 recipients", time: "2h ago", read: false },
  { id: 2, type: "warning", title: "Deliverability alert", body: "Open rate dropped 4% vs last 7 days average", time: "5h ago", read: false },
  { id: 3, type: "info", title: "Shopify sync complete", body: "2,841 new contacts imported from your store", time: "1d ago", read: true },
  { id: 4, type: "success", title: "Automation milestone", body: "Win-back flow hit 35% conversion rate", time: "2d ago", read: true },
  { id: 5, type: "info", title: "Invoice ready", body: "Your June 2026 invoice is available to download", time: "3d ago", read: true },
];

const searchResults = [
  { type: "Customer", label: "Sarah Mitchell", sub: "sarah.m@outlook.com" },
  { type: "Customer", label: "David Chen", sub: "dchen@devhub.io" },
  { type: "Campaign", label: "Summer Sale — VIP Segment", sub: "Sent Jun 3, 2026" },
  { type: "Segment", label: "High-value recent buyers", sub: "4,210 contacts" },
  { type: "Campaign", label: "June Newsletter", sub: "Scheduled Jun 6" },
];

const typeColors: Record<string, { bg: string; color: string }> = {
  Customer: { bg: "#EFF6FF", color: "#1D4ED8" },
  Campaign: { bg: "#F0FDF4", color: "#15803D" },
  Segment:  { bg: "#F5F3FF", color: "#6D28D9" },
};

const notifIcon: Record<string, { icon: any; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: "#15803D", bg: "#F0FDF4" },
  warning: { icon: AlertCircle,  color: "#C2410C", bg: "#FFF7ED" },
  info:    { icon: Info,         color: "#1D4ED8", bg: "#EFF6FF" },
};

function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

interface TopBarProps {
  active: string;
  onNavigate: (section: any) => void;
  onAction?: () => void;
  onMenuClick?: () => void;
}

export function TopBar({ active, onNavigate, onAction, onMenuClick }: TopBarProps) {
  const [searchQuery, setSearchQuery]       = useState("");
  const [searchOpen, setSearchOpen]         = useState(false);
  const [notifOpen, setNotifOpen]           = useState(false);
  const [userOpen, setUserOpen]             = useState(false);
  const [notifs, setNotifs]                 = useState(notifications);

  const searchRef = useRef<HTMLDivElement>(null!);
  const notifRef  = useRef<HTMLDivElement>(null!);
  const userRef   = useRef<HTMLDivElement>(null!);

  useClickOutside(searchRef, () => setSearchOpen(false));
  useClickOutside(notifRef,  () => setNotifOpen(false));
  useClickOutside(userRef,   () => setUserOpen(false));

  const unreadCount = notifs.filter((n) => !n.read).length;
  const filtered    = searchQuery.length > 0
    ? searchResults.filter((r) => r.label.toLowerCase().includes(searchQuery.toLowerCase()) || r.sub.toLowerCase().includes(searchQuery.toLowerCase()))
    : searchResults;

  const action = primaryActions[active];
  const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

  return (
    <header
      className="flex items-center gap-2 sm:gap-3 px-4 md:px-6"
      style={{ height: 56, background: "#FFFFFF", borderBottom: "1px solid var(--border)", fontFamily: font, minWidth: 0, position: "relative", zIndex: 40 }}
    >
      {/* Hamburger (mobile only) */}
      <button
        onClick={onMenuClick}
        className="flex items-center justify-center rounded md:hidden shrink-0"
        style={{ width: 34, height: 34, background: "#F8FAFC", border: "1px solid var(--border)" }}
        aria-label="Open menu"
      >
        <Menu size={16} color="#64748B" />
      </button>

      <h1 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>
        {navTitles[active] || "Dashboard"}
      </h1>
      <span className="hidden md:inline" style={{ color: "#CBD5E1", fontSize: 12 }}>/</span>
      <span className="hidden md:inline" style={{ color: "#64748B", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>o/acme-corp</span>

      <div className="flex-1" />

      {/* Search */}
      <div ref={searchRef} className="hidden md:block" style={{ position: "relative" }}>
        <div
          className="flex items-center gap-2 rounded"
          style={{
            background: "#F8FAFC", border: `1px solid ${searchOpen ? "#2563EB" : "var(--border)"}`,
            padding: "6px 10px", width: 240, transition: "border-color 0.15s",
          }}
        >
          <Search size={13} color="#94A3B8" />
          <input
            placeholder="Search customers, campaigns…"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#0F172A", width: "100%", fontFamily: font }}
          />
          {searchQuery ? (
            <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }}><X size={12} color="#94A3B8" /></button>
          ) : (
            <kbd style={{ background: "#E2E8F0", color: "#64748B", fontSize: 10, padding: "1px 5px", borderRadius: 3, fontFamily: "JetBrains Mono, monospace" }}>⌘K</kbd>
          )}
        </div>

        {searchOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, width: 320,
            background: "#FFFFFF", border: "1px solid var(--border)", borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 50, overflow: "hidden",
          }}>
            {!searchQuery && (
              <p style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.06em", padding: "10px 14px 6px" }}>RECENT</p>
            )}
            {filtered.map((r, i) => {
              const tc = typeColors[r.type];
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSearchOpen(false); setSearchQuery("");
                    if (r.type === "Customer") onNavigate("customers");
                    else if (r.type === "Campaign") onNavigate("campaigns");
                    else if (r.type === "Segment") onNavigate("customers");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                  style={{ fontSize: 12 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span className="rounded-full px-2 py-0.5 shrink-0" style={{ fontSize: 9, fontWeight: 600, background: tc.bg, color: tc.color }}>{r.type}</span>
                  <div className="min-w-0">
                    <p style={{ fontWeight: 500, color: "#0F172A" }} className="truncate">{r.label}</p>
                    <p style={{ fontSize: 11, color: "#64748B" }} className="truncate">{r.sub}</p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p style={{ fontSize: 12, color: "#94A3B8", padding: "16px 14px", textAlign: "center" }}>No results for "{searchQuery}"</p>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div ref={notifRef} style={{ position: "relative" }}>
        <button
          onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false); }}
          className="relative flex items-center justify-center rounded"
          style={{ width: 34, height: 34, background: notifOpen ? "#EFF6FF" : "#F8FAFC", border: `1px solid ${notifOpen ? "#BFDBFE" : "var(--border)"}` }}
        >
          <Bell size={15} color={notifOpen ? "#2563EB" : "#64748B"} />
          {unreadCount > 0 && (
            <span className="absolute flex items-center justify-center rounded-full"
              style={{ width: 14, height: 14, background: "#EF4444", top: -4, right: -4, fontSize: 9, color: "#fff", fontWeight: 600 }}>
              {unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340,
            background: "#FFFFFF", border: "1px solid var(--border)", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 50, overflow: "hidden",
          }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Notifications</span>
              <button onClick={() => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))}
                style={{ fontSize: 11, color: "#2563EB" }}>Mark all read</button>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {notifs.map((n) => {
                const ni = notifIcon[n.type];
                const Icon = ni.icon;
                return (
                  <div
                    key={n.id}
                    className="flex gap-3 px-4 py-3 cursor-pointer"
                    style={{ background: n.read ? "transparent" : "#FAFBFF", borderBottom: "1px solid #F8FAFC" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = n.read ? "transparent" : "#FAFBFF")}
                    onClick={() => setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                  >
                    <div className="rounded-lg flex items-center justify-center shrink-0"
                      style={{ width: 30, height: 30, background: ni.bg, marginTop: 1 }}>
                      <Icon size={13} color={ni.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p style={{ fontSize: 12, fontWeight: n.read ? 400 : 600, color: "#0F172A" }} className="truncate">{n.title}</p>
                        {!n.read && <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: "#2563EB", marginTop: 5, display: "inline-block" }} />}
                      </div>
                      <p style={{ fontSize: 11, color: "#64748B", marginTop: 1 }}>{n.body}</p>
                      <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{n.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div ref={userRef} style={{ position: "relative" }}>
        <button
          onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }}
          className="flex items-center gap-2 rounded"
          style={{ height: 34, padding: "0 10px 0 6px", background: userOpen ? "#EFF6FF" : "#F8FAFC", border: `1px solid ${userOpen ? "#BFDBFE" : "var(--border)"}` }}
        >
          <div className="rounded-full flex items-center justify-center text-white"
            style={{ width: 22, height: 22, background: "#2563EB", fontSize: 10, fontWeight: 600 }}>RN</div>
          <span className="hidden sm:inline" style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>Ryan</span>
          <ChevronDown size={12} color="#94A3B8" className="hidden sm:inline" style={{ transform: userOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>

        {userOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, width: 220,
            background: "#FFFFFF", border: "1px solid var(--border)", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 50, overflow: "hidden",
          }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>Ryan Nguyen</p>
              <p style={{ fontSize: 11, color: "#64748B" }}>ryan@acmecorp.io</p>
              <span className="rounded-full px-2 py-0.5 mt-1 inline-block" style={{ fontSize: 10, fontWeight: 600, background: "#7C3AED", color: "#fff" }}>Super Admin</span>
            </div>
            {[
              { icon: User, label: "Profile", action: () => { onNavigate("settings"); setUserOpen(false); } },
              { icon: Settings, label: "Settings", action: () => { onNavigate("settings"); setUserOpen(false); } },
              { icon: HelpCircle, label: "Help & Support", action: () => setUserOpen(false) },
            ].map(({ icon: Icon, label, action }) => (
              <button key={label} onClick={action}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left"
                style={{ fontSize: 12, color: "#374151" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon size={13} color="#64748B" />{label}
              </button>
            ))}
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left"
                style={{ fontSize: 12, color: "#DC2626" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF1F2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={13} color="#DC2626" />Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Primary CTA */}
      {action && (
        <button
          onClick={() => { onAction?.(); }}
          className="flex items-center gap-1.5 rounded"
          style={{ background: "#2563EB", color: "#FFFFFF", fontSize: 12, fontWeight: 500, padding: "7px 14px", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          <Plus size={13} /><span className="hidden sm:inline">{action}</span>
        </button>
      )}
    </header>
  );
}
