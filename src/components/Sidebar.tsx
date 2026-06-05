import {
  LayoutDashboard, Users, Send, Zap, FileText, BarChart2, Settings,
  ChevronRight, ChevronDown, Mail, LogOut, HelpCircle
} from "lucide-react";
import { useState } from "react";
import type { CustomerSubTab, NavSection } from "./navigation-types";

interface SidebarProps {
  active: NavSection;
  customerSubTab?: CustomerSubTab;
  onNavigate: (section: NavSection) => void;
  onNavigateCustomer: (sub: CustomerSubTab) => void;
}

const navItems = [
  { id: "dashboard" as NavSection, label: "Dashboard", icon: LayoutDashboard },
  {
    id: "customers" as NavSection, label: "Customers", icon: Users,
    children: [
      { label: "All Customers", sub: "customers" as CustomerSubTab },
      { label: "Lists",         sub: "lists"     as CustomerSubTab },
      { label: "Segments",      sub: "segments"  as CustomerSubTab },
    ],
  },
  { id: "campaigns"   as NavSection, label: "Campaigns",   icon: Mail },
  { id: "automations" as NavSection, label: "Automations", icon: Zap },
  { id: "forms"       as NavSection, label: "Forms",       icon: FileText },
  { id: "analytics"   as NavSection, label: "Analytics",   icon: BarChart2 },
];

export function Sidebar({ active, customerSubTab, onNavigate, onNavigateCustomer }: SidebarProps) {
  const [expandedCustomers, setExpandedCustomers] = useState(true);

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        background: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
        width: 220,
        minWidth: 220,
        fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5"
        style={{ height: 56, borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="flex items-center justify-center rounded"
          style={{ width: 28, height: 28, background: "#2563EB" }}
        >
          <Send size={14} color="#fff" />
        </div>
        <span style={{ color: "#F8FAFC", fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em" }}>
          NetX CRM
        </span>
      </div>

      {/* Org badge */}
      <div className="px-4 py-3">
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer"
          style={{ background: "var(--sidebar-accent)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="rounded flex items-center justify-center text-white"
            style={{ width: 20, height: 20, background: "#7C3AED", fontSize: 10, fontWeight: 600 }}
          >
            A
          </div>
          <span style={{ color: "#CBD5E1", fontSize: 12, fontWeight: 500 }}>Acme Corp</span>
          <ChevronDown size={12} color="#64748B" className="ml-auto" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="mb-1">
          <p style={{ color: "#475569", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", padding: "4px 8px 6px" }}>
            MAIN
          </p>

          {navItems.map((item) => {
            const isActive = active === item.id;
            const Icon = item.icon;

            if (item.children) {
              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      onNavigate(item.id);
                      setExpandedCustomers(!expandedCustomers);
                    }}
                    className="w-full flex items-center gap-2.5 rounded px-2.5 py-2 mb-0.5"
                    style={{
                      background: isActive ? "var(--sidebar-accent)" : "transparent",
                      color: isActive ? "#F8FAFC" : "var(--sidebar-foreground)",
                      fontSize: 13,
                      fontWeight: isActive ? 500 : 400,
                      transition: "background 0.1s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <Icon size={15} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {expandedCustomers
                      ? <ChevronDown size={12} />
                      : <ChevronRight size={12} />}
                  </button>

                  {expandedCustomers && (
                    <div className="ml-4 pl-3 mt-0.5 mb-1" style={{ borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
                      {item.children.map((child) => {
                        const isChildActive = active === "customers" && customerSubTab === child.sub;
                        return (
                          <button
                            key={child.sub}
                            onClick={() => onNavigateCustomer(child.sub)}
                            className="w-full text-left px-2.5 py-1.5 rounded mb-0.5"
                            style={{
                              fontSize: 12,
                              fontWeight: isChildActive ? 500 : 400,
                              color: isChildActive ? "#F8FAFC" : "#64748B",
                              background: isChildActive ? "rgba(59,130,246,0.18)" : "transparent",
                              transition: "background 0.1s, color 0.1s",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              if (!isChildActive) {
                                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                e.currentTarget.style.color = "#94A3B8";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isChildActive) {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#64748B";
                              }
                            }}
                          >
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-2.5 rounded px-2.5 py-2 mb-0.5"
                style={{
                  background: isActive ? "var(--sidebar-accent)" : "transparent",
                  color: isActive ? "#F8FAFC" : "var(--sidebar-foreground)",
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  transition: "background 0.1s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <p style={{ color: "#475569", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", padding: "4px 8px 6px" }}>
            ADMIN
          </p>
          <button
            onClick={() => onNavigate("settings")}
            className="w-full flex items-center gap-2.5 rounded px-2.5 py-2 mb-0.5"
            style={{
              background: active === "settings" ? "var(--sidebar-accent)" : "transparent",
              color: active === "settings" ? "#F8FAFC" : "var(--sidebar-foreground)",
              fontSize: 13,
              fontWeight: active === "settings" ? 500 : 400,
              transition: "background 0.1s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { if (active !== "settings") e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { if (active !== "settings") e.currentTarget.style.background = "transparent"; }}
          >
            <Settings size={15} />
            Settings
          </button>
          <button
            className="w-full flex items-center gap-2.5 rounded px-2.5 py-2"
            style={{ color: "var(--sidebar-foreground)", fontSize: 13, transition: "background 0.1s", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <HelpCircle size={15} />
            Help & Support
          </button>
        </div>
      </nav>

      {/* User footer */}
      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div
          className="flex items-center gap-2.5 px-2 py-1.5 rounded cursor-pointer"
          style={{ color: "var(--sidebar-foreground)", transition: "background 0.1s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <div
            className="rounded-full flex items-center justify-center text-white"
            style={{ width: 28, height: 28, background: "#2563EB", fontSize: 11, fontWeight: 600 }}
          >
            RN
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ color: "#E2E8F0", fontSize: 12, fontWeight: 500 }}>Ryan Nguyen</p>
            <p style={{ color: "#475569", fontSize: 11 }} className="truncate">ryan@acmecorp.io</p>
          </div>
          <LogOut size={13} color="#475569" />
        </div>
      </div>
    </aside>
  );
}
