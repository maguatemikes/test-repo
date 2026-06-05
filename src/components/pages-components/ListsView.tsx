"use client";

import { List, Plus, MoreHorizontal, Users, Upload, Download, Archive, Search, X, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { ImportCsvModal } from "../ImportCsvModal";

const lists = [
  { id: "L001", name: "Newsletter Subscribers", members: 48291, source: "Form + CSV", created: "Jan 10, 2026", updated: "Jun 3, 2026", description: "All contacts opted in via newsletter forms and imports" },
  { id: "L002", name: "VIP Customers", members: 3420, source: "Manual + Tag rule", created: "Feb 1, 2026", updated: "May 28, 2026", description: "Customers tagged as VIP with LTV > $2,000" },
  { id: "L003", name: "Shopify Sync — All Buyers", members: 21804, source: "Shopify integration", created: "Jan 22, 2026", updated: "Jun 3, 2026", description: "Auto-synced from connected Shopify store" },
  { id: "L004", name: "Blog Readers", members: 6120, source: "Form (slide-in)", created: "Mar 5, 2026", updated: "Jun 1, 2026", description: "Subscribers captured via blog sidebar opt-in" },
  { id: "L005", name: "Waitlist — Footwear Launch", members: 840, source: "Form (full-screen)", created: "May 30, 2026", updated: "Jun 2, 2026", description: "Pre-launch interest list for upcoming footwear line" },
  { id: "L006", name: "Win-back Pool", members: 9830, source: "Segment export", created: "Apr 14, 2026", updated: "May 31, 2026", description: "Contacts inactive for 60+ days, exported from segment" },
];

const listMembers: Record<string, Array<{ name: string; email: string; joined: string; source: string }>> = {
  L001: [
    { name: "Sarah Mitchell", email: "sarah.m@outlook.com", joined: "Jan 12, 2026", source: "Form" },
    { name: "David Chen", email: "dchen@devhub.io", joined: "Jan 14, 2026", source: "CSV Import" },
    { name: "Priya Nair", email: "priya.nair@work.co", joined: "Jan 18, 2026", source: "Form" },
    { name: "Emma Larsson", email: "emma.l@se.com", joined: "Jan 22, 2026", source: "Form" },
    { name: "Yuki Tanaka", email: "yuki.t@hana.jp", joined: "Jun 3, 2026", source: "Form" },
  ],
  L002: [
    { name: "Priya Nair", email: "priya.nair@work.co", joined: "Feb 2, 2026", source: "Tag rule" },
    { name: "Emma Larsson", email: "emma.l@se.com", joined: "Feb 5, 2026", source: "Tag rule" },
    { name: "David Chen", email: "dchen@devhub.io", joined: "Feb 10, 2026", source: "Manual" },
  ],
};

const sourceColors: Record<string, { bg: string; color: string }> = {
  "Form": { bg: "#EFF6FF", color: "#1D4ED8" },
  "Form + CSV": { bg: "#EFF6FF", color: "#1D4ED8" },
  "CSV Import": { bg: "#F5F3FF", color: "#6D28D9" },
  "Manual + Tag rule": { bg: "#FFF7ED", color: "#C2410C" },
  "Shopify integration": { bg: "#F0FDF4", color: "#15803D" },
  "Form (slide-in)": { bg: "#EFF6FF", color: "#1D4ED8" },
  "Form (full-screen)": { bg: "#EFF6FF", color: "#1D4ED8" },
  "Segment export": { bg: "#FEF9C3", color: "#854D0E" },
  "Tag rule": { bg: "#FFF7ED", color: "#C2410C" },
  "Manual": { bg: "#F8FAFC", color: "#475569" },
};

interface ListsViewProps {
  onBack?: () => void;
}

export function ListsView({ onBack }: ListsViewProps) {
  const [openList, setOpenList] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  const selectedList = lists.find((l) => l.id === openList);
  const members = openList ? (listMembers[openList] ?? []) : [];

  if (openList && selectedList) {
    return (
      <div className="p-6 space-y-4" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setOpenList(null)}
            className="flex items-center gap-1.5"
            style={{ fontSize: 12, color: "#2563EB" }}
          >
            <ChevronLeft size={13} /> Lists
          </button>
          <span style={{ color: "#CBD5E1", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12, color: "#64748B" }}>{selectedList.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>{selectedList.name}</h2>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{selectedList.description}</p>
          </div>
          <div className="flex gap-2">
            {csvModalOpen && selectedList && (
              <ImportCsvModal onClose={() => setCsvModalOpen(false)} context="list" listName={selectedList.name} />
            )}
            <button onClick={() => setCsvModalOpen(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ fontSize: 12, border: "1px solid var(--border)", color: "#64748B", background: "#FFFFFF", cursor: "pointer" }}>
              <Upload size={12} /> Import CSV
            </button>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ fontSize: 12, border: "1px solid var(--border)", color: "#64748B", background: "#FFFFFF" }}>
              <Download size={12} /> Export
            </button>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ fontSize: 12, background: "#2563EB", color: "#FFFFFF" }}>
              <Plus size={12} /> Add Member
            </button>
          </div>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            { label: "Total Members", value: selectedList.members.toLocaleString() },
            { label: "Source", value: selectedList.source },
            { label: "Last Updated", value: selectedList.updated },
          ].map((m) => (
            <div key={m.label} className="rounded-lg p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>{m.label}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{m.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "#F8FAFC" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>Members</span>
            <span style={{ fontSize: 11, color: "#64748B", fontFamily: "JetBrains Mono, monospace" }}>{members.length} shown of {selectedList.members.toLocaleString()}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
                {["Name / Email", "Joined", "Source", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", padding: "8px 14px" }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const sc = sourceColors[m.source] || { bg: "#F8FAFC", color: "#64748B" };
                return (
                  <tr key={m.email} style={{ borderBottom: i < members.length - 1 ? "1px solid #F8FAFC" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "10px 14px" }}>
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-full flex items-center justify-center text-white"
                          style={{ width: 26, height: 26, background: `hsl(${m.email.charCodeAt(0) * 33}, 55%, 50%)`, fontSize: 10, fontWeight: 500, flexShrink: 0 }}>
                          {m.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{m.name}</p>
                          <p style={{ fontSize: 11, color: "#64748B" }}>{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>{m.joined}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.color }}>{m.source}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button style={{ color: "#94A3B8" }}><X size={12} /></button>
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "32px 14px", textAlign: "center", fontSize: 12, color: "#94A3B8" }}>
                    No member data loaded for this list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const filteredLists = lists.filter((l) =>
    !query || l.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 12, color: "#64748B" }}>
            <strong style={{ fontWeight: 600, color: "#0F172A" }}>{lists.length}</strong> static lists ·{" "}
            <strong style={{ fontWeight: 600, color: "#0F172A" }}>{lists.reduce((a, l) => a + l.members, 0).toLocaleString()}</strong> total members
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF" }}>
          <Plus size={13} /> New List
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg" style={{ background: "#FFFFFF", border: "1px solid var(--border)", padding: "7px 12px", width: 260 }}>
          <Search size={13} color="#94A3B8" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lists…"
            style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#0F172A", width: "100%" }} />
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
              {["List Name", "Members", "Source", "Created", "Last Updated", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", padding: "9px 14px" }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLists.map((l, i) => {
              const sc = sourceColors[l.source] || { bg: "#F8FAFC", color: "#64748B" };
              return (
                <tr
                  key={l.id}
                  style={{ borderBottom: i < filteredLists.length - 1 ? "1px solid #F8FAFC" : "none", cursor: "pointer" }}
                  onClick={() => setOpenList(l.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "11px 14px" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg flex items-center justify-center" style={{ width: 28, height: 28, background: "#EFF6FF" }}>
                        <List size={13} color="#2563EB" />
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{l.name}</p>
                        <p style={{ fontSize: 11, color: "#94A3B8" }}>{l.description}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 500, color: "#0F172A" }}>
                    {l.members.toLocaleString()}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.color }}>{l.source}</span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 11, color: "#64748B" }}>{l.created}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, color: "#64748B" }}>{l.updated}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <div className="flex items-center gap-1">
                      <button style={{ color: "#94A3B8" }} onClick={(e) => e.stopPropagation()}><Download size={13} /></button>
                      <button style={{ color: "#94A3B8" }} onClick={(e) => e.stopPropagation()}><Archive size={13} /></button>
                      <button style={{ color: "#94A3B8" }} onClick={(e) => e.stopPropagation()}><MoreHorizontal size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}