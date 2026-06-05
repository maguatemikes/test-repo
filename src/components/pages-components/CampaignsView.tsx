"use client";

import { MoreHorizontal, Copy, Archive, Eye, Send, Clock, Edit3, Plus, ChevronRight, X, ArrowUpRight, Users, MousePointerClick, TrendingDown, DollarSign, ChevronLeft } from "lucide-react";
import { useState } from "react";

const campaigns = [
  { id: 1, name: "Summer Sale — VIP Segment", status: "sent", type: "Promotional", recipients: 4210, opens: "38.2%", clicks: "7.4%", unsubs: "0.4%", revenue: "$14,800", sent: "Jun 3, 2026", subject: "🌞 Your exclusive summer deals inside" },
  { id: 2, name: "Win-back: 60-Day Inactive", status: "sent", type: "Winback", recipients: 9830, opens: "22.1%", clicks: "3.9%", unsubs: "1.1%", revenue: "$5,200", sent: "Jun 1, 2026", subject: "We miss you — here's 20% off" },
  { id: 3, name: "Abandoned Cart — Reminder 2", status: "sent", type: "Transactional", recipients: 1248, opens: "41.6%", clicks: "12.1%", unsubs: "0.2%", revenue: "$9,100", sent: "May 31, 2026", subject: "You left something behind…" },
  { id: 4, name: "May Newsletter", status: "sent", type: "Newsletter", recipients: 47200, opens: "28.4%", clicks: "5.1%", unsubs: "0.6%", revenue: "$2,400", sent: "May 15, 2026", subject: "May updates from Acme Corp" },
  { id: 5, name: "June Newsletter", status: "scheduled", type: "Newsletter", recipients: 48291, opens: "—", clicks: "—", unsubs: "—", revenue: "—", sent: "Jun 6, 09:00 AM", subject: "June roundup — what's new" },
  { id: 6, name: "Product Launch — Footwear Line", status: "scheduled", type: "Promotional", recipients: 22100, opens: "—", clicks: "—", unsubs: "—", revenue: "—", sent: "Jun 10, 10:00 AM", subject: "New arrivals: summer footwear" },
  { id: 7, name: "Q2 Customer Survey", status: "draft", type: "Survey", recipients: 0, opens: "—", clicks: "—", unsubs: "—", revenue: "—", sent: "Draft", subject: "How are we doing? (2 min survey)" },
  { id: 8, name: "Loyalty Tier Upgrade", status: "draft", type: "Loyalty", recipients: 0, opens: "—", clicks: "—", unsubs: "—", revenue: "—", sent: "Draft", subject: "Congrats — you've reached Gold tier!" },
];

const statusConfig: Record<string, { bg: string; color: string; icon: any; label: string }> = {
  sent: { bg: "#F0FDF4", color: "#16A34A", icon: Send, label: "Sent" },
  scheduled: { bg: "#EFF6FF", color: "#2563EB", icon: Clock, label: "Scheduled" },
  draft: { bg: "#F8FAFC", color: "#64748B", icon: Edit3, label: "Draft" },
};

const tabs = ["All", "Sent", "Scheduled", "Draft"];

type Campaign = typeof campaigns[0];

function SendTestDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("ryan@acmecorp.io");
  const [sent, setSent] = useState(false);
  const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 200 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(400px, calc(100vw - 32px))", background: "#FFFFFF", borderRadius: 12, padding: 24,
        border: "1px solid var(--border)", boxShadow: "0 16px 48px rgba(15,23,42,0.16)",
        zIndex: 201, fontFamily: font,
      }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Send Test Email</h3>
          <button onClick={onClose}><X size={16} color="#94A3B8" /></button>
        </div>
        {sent ? (
          <div className="text-center py-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-3" style={{ background: "#F0FDF4" }}>
              <span style={{ fontSize: 18 }}>✓</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>Test email sent!</p>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Check {email} in a few minutes.</p>
            <button onClick={onClose} className="mt-5 rounded-lg px-6 py-2"
              style={{ fontSize: 12, background: "#2563EB", color: "#FFFFFF", fontFamily: font }}>Done</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
              Send a preview of this campaign to a test address before sending to your audience.
            </p>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 6 }}>
              Test email address
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%", fontSize: 13, padding: "8px 12px",
                border: "1px solid var(--border)", borderRadius: 6,
                outline: "none", color: "#0F172A", fontFamily: font,
                boxSizing: "border-box",
              }}
            />
            <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Separate multiple addresses with commas</p>
            <div className="flex gap-2 mt-5">
              <button onClick={onClose} className="flex-1 rounded-lg py-2"
                style={{ fontSize: 12, background: "#F1F5F9", color: "#374151", border: "none", cursor: "pointer", fontFamily: font }}>
                Cancel
              </button>
              <button onClick={() => setSent(true)} className="flex-1 rounded-lg py-2"
                style={{ fontSize: 12, background: "#2563EB", color: "#FFFFFF", border: "none", cursor: "pointer", fontFamily: font }}>
                Send Test
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function CampaignDetail({ campaign, onBack }: { campaign: Campaign; onBack: () => void }) {
  const [sendTestOpen, setSendTestOpen] = useState(false);
  const sc = statusConfig[campaign.status];
  const Icon = sc.icon;
  const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
  const isSent = campaign.status === "sent";

  const stats = isSent ? [
    { label: "Recipients", value: campaign.recipients.toLocaleString(), icon: Users, color: "#2563EB", bg: "#EFF6FF" },
    { label: "Open Rate", value: campaign.opens, icon: ArrowUpRight, color: "#16A34A", bg: "#F0FDF4" },
    { label: "Click Rate", value: campaign.clicks, icon: MousePointerClick, color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Unsubscribes", value: campaign.unsubs, icon: TrendingDown, color: "#DC2626", bg: "#FFF1F2" },
    { label: "Revenue", value: campaign.revenue, icon: DollarSign, color: "#D97706", bg: "#FFF7ED" },
  ] : [
    { label: "Audience Size", value: campaign.recipients > 0 ? campaign.recipients.toLocaleString() : "—", icon: Users, color: "#2563EB", bg: "#EFF6FF" },
  ];

  const linkClicks = isSent ? [
    { url: "acmecorp.io/sale", clicks: 312, pct: "40.1%" },
    { url: "acmecorp.io/vip-offers", clicks: 198, pct: "25.4%" },
    { url: "acmecorp.io/unsubscribe", clicks: 33, pct: "4.2%" },
  ] : [];

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: font }}>
      {sendTestOpen && <SendTestDialog onClose={() => setSendTestOpen(false)} />}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1" style={{ fontSize: 12, color: "#2563EB" }}>
          <ChevronLeft size={13} /> Campaigns
        </button>
        <ChevronRight size={12} color="#CBD5E1" />
        <span style={{ fontSize: 12, color: "#64748B" }} className="truncate">{campaign.name}</span>
      </div>

      {/* Header card */}
      <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.color }}>
                <Icon size={10} />{sc.label}
              </span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>{campaign.type}</span>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>{campaign.name}</h2>
            <p style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>Subject: {campaign.subject}</p>
            <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
              {isSent ? `Sent ${campaign.sent}` : campaign.status === "scheduled" ? `Scheduled for ${campaign.sent}` : "Draft — not scheduled"}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSendTestOpen(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-2"
              style={{ fontSize: 12, background: "#F1F5F9", color: "#374151", border: "1px solid var(--border)", cursor: "pointer", fontFamily: font }}>
              <Send size={12} /> Send Test
            </button>
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-2"
              style={{ fontSize: 12, background: "#2563EB", color: "#FFFFFF", border: "none", cursor: "pointer", fontFamily: font }}>
              <Eye size={12} /> Preview
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {isSent && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
            const SIcon = s.icon;
            return (
              <div key={s.label} className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 11, color: "#64748B" }}>{s.label}</span>
                  <div className="rounded p-1" style={{ background: s.bg }}>
                    <SIcon size={12} color={s.color} />
                  </div>
                </div>
                <p style={{ fontSize: 20, fontWeight: 600, color: "#0F172A", fontFamily: "JetBrains Mono, monospace" }}>{s.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Link clicks + timeline */}
      {isSent && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>Top Link Clicks</p>
            <div className="space-y-3">
              {linkClicks.map((l) => (
                <div key={l.url}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: 11, color: "#374151", fontFamily: "JetBrains Mono, monospace" }}>{l.url}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#0F172A" }}>{l.clicks}</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 4, background: "#F1F5F9" }}>
                    <div className="rounded-full" style={{ height: "100%", width: l.pct, background: "#2563EB" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginBottom: 12 }}>Delivery Timeline</p>
            <div className="space-y-3">
              {[
                { label: "Queued", time: `${campaign.sent}, 08:58`, done: true },
                { label: "Sending started", time: `${campaign.sent}, 09:00`, done: true },
                { label: "All delivered", time: `${campaign.sent}, 09:04`, done: true },
                { label: "First open", time: `${campaign.sent}, 09:07`, done: true },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-3">
                  <div className="rounded-full shrink-0" style={{ width: 8, height: 8, background: t.done ? "#16A34A" : "#E2E8F0" }} />
                  <span style={{ fontSize: 12, color: "#0F172A" }}>{t.label}</span>
                  <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto" }}>{t.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isSent && (
        <div className="rounded-xl p-8 text-center" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
          <Icon size={28} color="#CBD5E1" className="mx-auto mb-3" />
          <p style={{ fontSize: 13, fontWeight: 500, color: "#64748B" }}>
            {campaign.status === "scheduled" ? `This campaign is scheduled for ${campaign.sent}` : "This campaign is a draft and hasn't been sent yet."}
          </p>
          {campaign.status === "draft" && (
            <button className="mt-4 rounded-lg px-5 py-2"
              style={{ fontSize: 12, background: "#2563EB", color: "#FFFFFF", fontFamily: font, cursor: "pointer" }}>
              Continue Editing
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CampaignsView() {
  const [activeTab, setActiveTab] = useState("All");
  const [composing, setComposing] = useState(false);
  const [step, setStep] = useState(1);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);

  const filtered = campaigns.filter((c) => {
    if (activeTab === "All") return true;
    return c.status === activeTab.toLowerCase();
  });

  if (composing) {
    return <ComposerWizard step={step} onStep={setStep} onBack={() => { setComposing(false); setStep(1); }} />;
  }

  if (detailCampaign) {
    return <CampaignDetail campaign={detailCampaign} onBack={() => setDetailCampaign(null)} />;
  }

  return (
    <div className="p-6 space-y-4" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#F1F5F9", width: "fit-content" }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: 12, fontWeight: 500, padding: "5px 16px", borderRadius: 6,
                background: activeTab === tab ? "#FFFFFF" : "transparent",
                color: activeTab === tab ? "#0F172A" : "#64748B",
                border: activeTab === tab ? "1px solid var(--border)" : "none",
              }}
            >
              {tab}
              {tab !== "All" && (
                <span className="ml-1.5 rounded-full px-1.5"
                  style={{ fontSize: 10, background: activeTab === tab ? "#F1F5F9" : "rgba(100,116,139,0.1)", color: "#64748B" }}>
                  {campaigns.filter((c) => c.status === tab.toLowerCase()).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2"
          style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF" }}
        >
          <Plus size={13} /> New Campaign
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto"><table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)" }}>
              {["Campaign", "Type", "Status", "Recipients", "Opens", "Clicks", "Unsubs", "Revenue", "Sent / Scheduled", ""].map((h) => (
                <th key={h} style={{
                  textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748B",
                  letterSpacing: "0.04em", padding: "9px 14px",
                }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const sc = statusConfig[c.status];
              const Icon = sc.icon;
              return (
                <tr
                  key={c.id}
                  onClick={() => setDetailCampaign(c)}
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F8FAFC" : "none", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 14px", maxWidth: 240 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: "#94A3B8" }} className="truncate">{c.subject}</p>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 11, color: "#64748B" }}>{c.type}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 w-fit"
                      style={{ fontSize: 10, fontWeight: 500, background: sc.bg, color: sc.color }}>
                      <Icon size={10} />{sc.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0F172A" }}>
                    {c.recipients > 0 ? c.recipients.toLocaleString() : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: c.opens !== "—" ? "#16A34A" : "#CBD5E1" }}>
                    {c.opens}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: c.clicks !== "—" ? "#2563EB" : "#CBD5E1" }}>
                    {c.clicks}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: c.unsubs !== "—" && parseFloat(c.unsubs) > 0.5 ? "#DC2626" : "#64748B" }}>
                    {c.unsubs}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 500, color: "#0F172A" }}>
                    {c.revenue}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: "#64748B" }}>{c.sent}</td>
                  <td style={{ padding: "10px 14px" }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button style={{ color: "#94A3B8", padding: 3 }} title="Preview"><Eye size={13} /></button>
                      <button style={{ color: "#94A3B8", padding: 3 }} title="Duplicate"><Copy size={13} /></button>
                      <button style={{ color: "#94A3B8", padding: 3 }} title="Archive"><Archive size={13} /></button>
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

function ComposerWizard({ step, onStep, onBack }: { step: number; onStep: (s: number) => void; onBack: () => void }) {
  const steps = ["Settings", "Audience", "Content", "Review & Send"];
  const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

  return (
    <div className="p-6" style={{ fontFamily: font }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onBack} className="flex items-center gap-1" style={{ fontSize: 12, color: "#2563EB" }}>
          <ChevronLeft size={13} /> Campaigns
        </button>
        <ChevronRight size={12} color="#94A3B8" />
        <span style={{ fontSize: 12, color: "#64748B" }}>New Campaign</span>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-0 mb-8 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", width: "fit-content" }}>
        {steps.map((s, idx) => {
          const n = idx + 1;
          const isDone = n < step;
          const isCurrent = n === step;
          return (
            <button key={s} onClick={() => onStep(n)} className="flex items-center gap-2 px-5 py-3"
              style={{
                fontSize: 12, fontWeight: isCurrent ? 600 : 400,
                background: isCurrent ? "#0F172A" : isDone ? "#EFF6FF" : "#FFFFFF",
                color: isCurrent ? "#FFFFFF" : isDone ? "#2563EB" : "#64748B",
                borderRight: idx < steps.length - 1 ? "1px solid var(--border)" : "none",
                fontFamily: font,
              }}
            >
              <span className="flex items-center justify-center rounded-full"
                style={{
                  width: 18, height: 18, fontSize: 10, fontWeight: 600,
                  background: isCurrent ? "#FFFFFF" : isDone ? "#2563EB" : "#E2E8F0",
                  color: isCurrent ? "#0F172A" : isDone ? "#FFFFFF" : "#64748B",
                }}>
                {isDone ? "✓" : n}
              </span>
              {s}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Campaign Settings</h2>
              {[
                { label: "Campaign Name (internal)", placeholder: "e.g. June Newsletter 2026", hint: "Not shown to recipients" },
                { label: "Subject Line", placeholder: "e.g. Your June deals are here 🎉", hint: "Keep under 50 chars for best deliverability" },
                { label: "Preview Text", placeholder: "e.g. Open to see what's new this month…", hint: "Shows after subject in inbox" },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 6 }}>{f.label}</label>
                  <input placeholder={f.placeholder}
                    style={{ width: "100%", fontSize: 13, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, outline: "none", color: "#0F172A", fontFamily: font, boxSizing: "border-box" }} />
                  <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{f.hint}</p>
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 6 }}>Sender Identity</label>
                <select style={{ width: "100%", fontSize: 13, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, color: "#0F172A", background: "#FFFFFF", fontFamily: font }}>
                  <option>Acme Corp &lt;hello@acmecorp.io&gt;</option>
                  <option>Ryan Nguyen &lt;ryan@acmecorp.io&gt;</option>
                </select>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Select Audience</h2>
              <div className="space-y-3">
                {[
                  { type: "Segment", name: "High-value recent buyers", count: "4,210" },
                  { type: "List", name: "Newsletter subscribers", count: "48,291" },
                  { type: "Segment", name: "At-risk customers", count: "9,830" },
                ].map((a) => (
                  <label key={a.name} className="flex items-center gap-3 rounded-lg p-3 cursor-pointer" style={{ border: "1px solid var(--border)" }}>
                    <input type="radio" name="audience" style={{ accentColor: "#2563EB" }} />
                    <div>
                      <span style={{ fontSize: 11, color: "#64748B" }}>{a.type}</span>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{a.name}</p>
                    </div>
                    <span className="ml-auto rounded-full px-2 py-0.5"
                      style={{ fontSize: 11, background: "#F1F5F9", color: "#64748B", fontFamily: "JetBrains Mono, monospace" }}>
                      {a.count}
                    </span>
                  </label>
                ))}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#0F172A", display: "block", marginBottom: 6 }}>Exclusion Rules (optional)</label>
                <select style={{ width: "100%", fontSize: 13, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, color: "#94A3B8", fontFamily: font }}>
                  <option value="">Exclude a segment or list…</option>
                  <option>Unsubscribed</option>
                  <option>Bounced</option>
                </select>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Email Content</h2>
              <div className="rounded-lg flex items-center justify-center" style={{ height: 320, background: "#F8FAFC", border: "2px dashed #CBD5E1" }}>
                <div className="text-center">
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#64748B" }}>Drag-and-drop email builder</p>
                  <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Powered by Unlayer — opens in full editor</p>
                  <button className="mt-4 rounded-lg px-4 py-2"
                    style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", fontFamily: font }}>
                    Open Email Builder
                  </button>
                </div>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Review & Send</h2>
              <div className="space-y-4">
                {[
                  { label: "Campaign", value: "June Newsletter 2026" },
                  { label: "Subject", value: "Your June deals are here 🎉" },
                  { label: "Sender", value: "Acme Corp <hello@acmecorp.io>" },
                  { label: "Audience", value: "Newsletter subscribers — 48,291 recipients" },
                  { label: "Schedule", value: "Send now" },
                ].map((r) => (
                  <div key={r.label} className="flex items-start justify-between py-3" style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <span style={{ fontSize: 12, color: "#64748B", width: 120, flexShrink: 0 }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#0F172A" }}>{r.value}</span>
                  </div>
                ))}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" style={{ accentColor: "#2563EB" }} />
                  <span style={{ fontSize: 12, color: "#64748B" }}>I've reviewed the content and confirm this send</span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Side summary */}
        <div className="space-y-3">
          <div className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em" }}>SEND ESTIMATE</p>
            <p style={{ fontSize: 28, fontWeight: 600, color: "#0F172A", marginTop: 6, fontFamily: "JetBrains Mono, monospace" }}>48,291</p>
            <p style={{ fontSize: 11, color: "#64748B" }}>estimated recipients</p>
            <div className="mt-4 rounded-lg p-3" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
              <p style={{ fontSize: 11, color: "#15803D", fontWeight: 500 }}>✓ Sending domain verified</p>
            </div>
          </div>
          <div className="rounded-xl p-4 space-y-2" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em" }}>CHECKLIST</p>
            {["Subject line set", "Sender identity confirmed", "Audience selected", "Content added", "Tested on mobile"].map((item, i) => (
              <div key={item} className="flex items-center gap-2">
                <span style={{ fontSize: 12, color: i < 3 ? "#16A34A" : "#CBD5E1" }}>{i < 3 ? "✓" : "○"}</span>
                <span style={{ fontSize: 12, color: i < 3 ? "#0F172A" : "#94A3B8" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between mt-6">
        <button onClick={() => step > 1 ? onStep(step - 1) : onBack()}
          style={{ fontSize: 12, fontWeight: 500, color: "#64748B", background: "#F1F5F9", border: "none", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontFamily: font }}>
          ← Back
        </button>
        <button onClick={() => step < 4 ? onStep(step + 1) : undefined}
          style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: "#2563EB", border: "none", padding: "8px 24px", borderRadius: 6, cursor: "pointer", fontFamily: font }}>
          {step === 4 ? "🚀 Send Campaign" : "Save & Continue →"}
        </button>
      </div>
    </div>
  );
}