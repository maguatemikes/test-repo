"use client";

import { List, Plus, MoreHorizontal, Upload, Download, Trash2, Search, X, ChevronLeft } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { ImportCsvModal } from "../ImportCsvModal";
import { EmptyState } from "@/components/ui/EmptyState";

const SkBar = ({ w, h = 12, r = 6 }: { w: number; h?: number; r?: number }) => (
  <div className="animate-pulse" style={{ width: w, height: h, borderRadius: r, background: "#E2E8F0", flexShrink: 0 }} />
);

type ListRow = { id: number; name: string; description: string; source: string; count: number; created: string; updated: string };
type MemberRow = { id: number; name: string; email: string; source: string; joined: string };
type Candidate = { id: number; name: string; email: string };

const sourceColors: Record<string, { bg: string; color: string }> = {
  form: { bg: "#EFF6FF", color: "#1D4ED8" },
  manual: { bg: "#F8FAFC", color: "#475569" },
  csv: { bg: "#F5F3FF", color: "#6D28D9" },
  netx_backfill: { bg: "#FEF9C3", color: "#854D0E" },
  api: { bg: "#F0FDF4", color: "#15803D" },
};
const sourceLabel = (s: string) =>
  ({ form: "Form", manual: "Manual", csv: "CSV", netx_backfill: "Import", api: "API" }[s] || s);

interface ListsViewProps {
  onBack?: () => void;
}

export function ListsView({ }: ListsViewProps) {
  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openList, setOpenList] = useState<number | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Add-member search state
  const [adding, setAdding] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<Candidate[]>([]);

  const loadLists = useCallback(() => {
    setLoading(true);
    fetch("/api/lists")
      .then((r) => r.json())
      .then((d) => setLists(d.lists || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadLists(); }, [loadLists]);

  const loadMembers = useCallback((id: number) => {
    setMembersLoading(true);
    fetch(`/api/lists?members=${id}`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, []);

  const openDetail = (id: number) => { setOpenList(id); setAdding(false); setAddQuery(""); setAddResults([]); loadMembers(id); };

  const newList = async () => {
    const name = window.prompt("New list name:");
    if (!name || !name.trim()) return;
    const res = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    const d = await res.json();
    if (d.ok) loadLists(); else alert(d.error || "Failed to create list");
  };

  const removeList = async (id: number) => {
    if (!window.confirm("Delete this list? Members are removed from the list (customers are not deleted).")) return;
    const res = await fetch(`/api/lists?id=${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.ok) { if (openList === id) setOpenList(null); loadLists(); } else alert(d.error || "Failed to delete");
  };

  const searchAdd = (q: string) => {
    setAddQuery(q);
    if (!q.trim()) { setAddResults([]); return; }
    fetch(`/api/lists?search=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setAddResults(d.candidates || []))
      .catch(() => {});
  };

  const addMemberToList = async (customerId: number) => {
    if (!openList) return;
    const res = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", listId: openList, customerId }) });
    const d = await res.json();
    if (d.ok) { setAddQuery(""); setAddResults([]); loadMembers(openList); loadLists(); } else alert(d.error || "Failed to add");
  };

  const removeMemberFromList = async (customerId: number) => {
    if (!openList) return;
    const res = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", listId: openList, customerId }) });
    const d = await res.json();
    if (d.ok) { loadMembers(openList); loadLists(); } else alert(d.error || "Failed to remove");
  };

  const selectedList = lists.find((l) => l.id === openList);

  // ---------- detail view ----------
  if (openList && selectedList) {
    return (
      <div className="p-6 space-y-4" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setOpenList(null)} className="flex items-center gap-1.5" style={{ fontSize: 12, color: "#2563EB" }}>
            <ChevronLeft size={13} /> Lists
          </button>
          <span style={{ color: "#CBD5E1", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12, color: "#64748B" }}>{selectedList.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>{selectedList.name}</h2>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{selectedList.description || "Static list"}</p>
          </div>
          <div className="flex gap-2">
            {csvModalOpen && (
              <ImportCsvModal onClose={() => setCsvModalOpen(false)} context="list" listName={selectedList.name} />
            )}
            <button onClick={() => setCsvModalOpen(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ fontSize: 12, border: "1px solid var(--border)", color: "#64748B", background: "#FFFFFF", cursor: "pointer" }}>
              <Upload size={12} /> Import CSV
            </button>
            <button onClick={() => setAdding((a) => !a)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ fontSize: 12, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
              <Plus size={12} /> Add Member
            </button>
          </div>
        </div>

        {/* Add-member search */}
        {adding && (
          <div className="rounded-lg p-3" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 rounded-lg" style={{ border: "1px solid var(--border)", padding: "7px 12px" }}>
              <Search size={13} color="#94A3B8" />
              <input autoFocus value={addQuery} onChange={(e) => searchAdd(e.target.value)} placeholder="Search customers by name or email…"
                style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#0F172A", width: "100%" }} />
            </div>
            {addResults.length > 0 && (
              <div className="mt-2" style={{ maxHeight: 220, overflowY: "auto" }}>
                {addResults.map((c) => (
                  <button key={c.id} onClick={() => addMemberToList(c.id)} className="flex items-center justify-between w-full px-2 py-2 rounded"
                    style={{ fontSize: 12, color: "#0F172A", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <span><strong style={{ fontWeight: 500 }}>{c.name}</strong> <span style={{ color: "#94A3B8" }}>{c.email}</span></span>
                    <span style={{ color: "#2563EB", fontSize: 11 }}>+ Add</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {[
            { label: "Total Members", value: selectedList.count.toLocaleString() },
            { label: "Source", value: sourceLabel(selectedList.source) },
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
            <span style={{ fontSize: 11, color: "#64748B", fontFamily: "JetBrains Mono, monospace" }}>{members.length} of {selectedList.count.toLocaleString()}</span>
          </div>
          <div className="overflow-x-auto"><table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
                {["Name / Email", "Joined", "Source", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", padding: "8px 14px" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {membersLoading ? (
                <tr><td colSpan={4} style={{ padding: "32px 14px", textAlign: "center", fontSize: 12, color: "#94A3B8" }}>Loading members…</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: "32px 14px", textAlign: "center", fontSize: 12, color: "#94A3B8" }}>No members yet — use “Add Member”.</td></tr>
              ) : members.map((m, i) => {
                const sc = sourceColors[m.source] || { bg: "#F8FAFC", color: "#64748B" };
                return (
                  <tr key={m.id} style={{ borderBottom: i < members.length - 1 ? "1px solid #F8FAFC" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
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
                      <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.color }}>{sourceLabel(m.source)}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => removeMemberFromList(m.id)} title="Remove from list" style={{ color: "#94A3B8", cursor: "pointer" }}><X size={12} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      </div>
    );
  }

  // ---------- list view ----------
  const filteredLists = lists.filter((l) => !query || l.name.toLowerCase().includes(query.toLowerCase()));
  const totalMembers = lists.reduce((a, l) => a + l.count, 0);

  return (
    <div className="p-6 space-y-4" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, color: "#64748B" }}>
          {loading ? "Loading lists…" : (
            <><strong style={{ fontWeight: 600, color: "#0F172A" }}>{lists.length}</strong> static lists ·{" "}
            <strong style={{ fontWeight: 600, color: "#0F172A" }}>{totalMembers.toLocaleString()}</strong> total members</>
          )}
        </p>
        <button onClick={newList} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
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
        <div className="overflow-x-auto"><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
              {["List Name", "Members", "Source", "Created", "Last Updated", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", padding: "9px 14px" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`} style={{ borderBottom: "1px solid #F8FAFC" }}>
                <td style={{ padding: "11px 14px" }}><div className="flex items-center gap-2.5"><SkBar w={28} h={28} r={8} /><div className="flex flex-col gap-1.5"><SkBar w={130} h={11} /><SkBar w={170} h={9} /></div></div></td>
                <td style={{ padding: "11px 14px" }}><SkBar w={30} h={11} /></td>
                <td style={{ padding: "11px 14px" }}><SkBar w={54} h={18} r={999} /></td>
                <td style={{ padding: "11px 14px" }}><SkBar w={70} h={10} /></td>
                <td style={{ padding: "11px 14px" }}><SkBar w={70} h={10} /></td>
                <td style={{ padding: "11px 14px" }}><SkBar w={50} h={14} /></td>
              </tr>
            ))}
            {!loading && filteredLists.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 0 }}>
                <EmptyState
                  icon={List}
                  title={query ? "No lists match your search" : "No lists yet"}
                  description={query ? "Try a different search term." : "Lists are audiences you build by hand — add customers manually, or collect them via a form opt-in."}
                  action={!query ? (
                    <button onClick={newList} className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
                      <Plus size={13} /> New List
                    </button>
                  ) : undefined}
                />
              </td></tr>
            )}
            {filteredLists.map((l, i) => {
              const sc = sourceColors[l.source] || { bg: "#F8FAFC", color: "#64748B" };
              return (
                <tr key={l.id} style={{ borderBottom: i < filteredLists.length - 1 ? "1px solid #F8FAFC" : "none", cursor: "pointer" }}
                  onClick={() => openDetail(l.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
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
                  <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{l.count.toLocaleString()}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.color }}>{sourceLabel(l.source)}</span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 11, color: "#64748B" }}>{l.created}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, color: "#64748B" }}>{l.updated}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <div className="flex items-center gap-1">
                      <button style={{ color: "#94A3B8" }} onClick={(e) => e.stopPropagation()} title="Export"><Download size={13} /></button>
                      <button style={{ color: "#94A3B8" }} onClick={(e) => { e.stopPropagation(); removeList(l.id); }} title="Delete list"><Trash2 size={13} /></button>
                      <button style={{ color: "#94A3B8" }} onClick={(e) => e.stopPropagation()}><MoreHorizontal size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
