"use client";

import { FileText, Plus, Pencil, Trash2, Copy, X, ArrowRight, Image as ImageIcon, Tag, MoreVertical, Sparkles, Type } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, type Template } from "@/lib/templates";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
const fmtDate = (d?: string | null) => { if (!d) return "—"; const x = new Date(d); return isNaN(+x) ? "—" : x.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };

export function ContentView() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [details, setDetails] = useState<Record<number, Template>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [seed, setSeed] = useState<QuickStart | null>(null);
  const [archiveId, setArchiveId] = useState<number | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const reload = useCallback(async () => { setLoading(true); setTemplates(await listTemplates()); setLoading(false); }, []);
  useEffect(() => { reload(); }, [reload]);

  // List rows omit htmlBody/design, so lazily pull each full record to upgrade
  // the card preview to its real thumbnail/body. Cards render immediately with
  // a stylized fallback; previews fill in as these resolve.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(templates.map(async (t) => [t.id, await getTemplate(t.id)] as const));
      if (!cancelled) setDetails(Object.fromEntries(entries.filter(([, v]) => v) as [number, Template][]));
    })();
    return () => { cancelled = true; };
  }, [templates]);

  const onDelete = (id: number) => setArchiveId(id);
  const confirmArchive = async () => {
    if (archiveId == null) return;
    setArchiving(true);
    const ok = await deleteTemplate(archiveId);
    setArchiving(false);
    if (ok) { setArchiveId(null); reload(); } else alert("Archive failed.");
  };
  const onDuplicate = async (id: number) => {
    if (await duplicateTemplate(id)) reload(); else alert("Duplicate failed.");
  };
  const onRename = (id: number, current: string) => { setRenameValue(current); setRenameId(id); };
  const confirmRename = async () => {
    const name = renameValue.trim();
    if (renameId == null || !name) return;
    setRenaming(true);
    const ok = await updateTemplate(renameId, { name });
    setRenaming(false);
    if (ok) { setRenameId(null); reload(); } else alert("Rename failed.");
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: font }}>
      <style>{`
        .nx-doc-html img { max-width:100%; height:auto; border-radius:8px; margin:10px 0; display:block; }
        .nx-doc-html h1 { font-size:28px; font-weight:700; line-height:1.15; margin:6px 0 8px; color:var(--nx-head,#0F172A); }
        .nx-doc-html h2 { font-size:20px; font-weight:700; margin:18px 0 6px; color:var(--nx-head,#0F172A); }
        .nx-doc-html h3 { font-size:16px; font-weight:600; margin:14px 0 4px; color:var(--nx-head,#0F172A); }
        .nx-doc-html p { margin:8px 0; }
        .nx-doc-html ul, .nx-doc-html ol { padding-left:20px; margin:8px 0; }
        .nx-doc-html li { margin:4px 0; }
        .nx-doc-html blockquote { border-left:3px solid var(--nx-accent,#E2E8F0); padding-left:12px; color:#64748B; font-style:italic; margin:10px 0; }
        .nx-doc-html hr { border:none; border-top:1px solid var(--nx-rule,#E2E8F0); margin:16px 0; }
        .nx-doc-html a { color:var(--nx-accent,#2563EB); font-weight:500; }
      `}</style>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#0F172A" }}>Content</h1>
          <p style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>Reusable email templates your campaigns and automations deliver.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/forms" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2"
            style={{ fontSize: 12, fontWeight: 500, background: "#FFFFFF", border: "1px solid var(--border)", color: "#64748B", textDecoration: "none" }}>
            <FileText size={13} /> Forms <ArrowRight size={12} />
          </Link>
          <button onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2"
            style={{ fontSize: 12, fontWeight: 500, background: "#2563EB", color: "#FFFFFF", cursor: "pointer" }}>
            <Plus size={13} /> New Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl" style={{ height: 360, background: "#FFFFFF", border: "1px solid var(--border)", opacity: 0.6 }} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <BlankDraftCard onClick={() => setEditing("new")} />
          {templates.map((t) => (
            <TemplateCard key={t.id} t={t} detail={details[t.id]}
              onOpen={() => setEditing(t.id)} onRename={() => onRename(t.id, t.name)} onDuplicate={() => onDuplicate(t.id)} onDelete={() => onDelete(t.id)} />
          ))}
        </div>
      )}

      <div className="pt-2">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Quick start templates</h2>
        <p style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>Choose from a premade template to get started writing.</p>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
          {QUICK_STARTS.map((qs) => (
            <QuickStartCard key={qs.key} qs={qs} onUse={() => { setSeed(qs); setEditing("new"); }} />
          ))}
        </div>
      </div>

      {editing !== null && (
        <TemplateEditor id={editing === "new" ? null : editing} seed={editing === "new" ? seed : null}
          onClose={() => { setEditing(null); setSeed(null); }}
          onSaved={(savedId) => { reload(); setSeed(null); if (savedId != null) setEditing(savedId); }} />
      )}

      <ConfirmDialog
        open={archiveId !== null}
        danger
        title="Archive this template?"
        message={`“${templates.find((t) => t.id === archiveId)?.name ?? "This template"}” will be moved to your archive. Campaigns already sent are unaffected.`}
        confirmLabel="Archive"
        busy={archiving}
        onConfirm={confirmArchive}
        onCancel={() => { if (!archiving) setArchiveId(null); }}
      />

      {renameId !== null && (
        <div onClick={() => { if (!renaming) setRenameId(null); }} className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(15,23,42,0.4)", fontFamily: font }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); confirmRename(); }} className="rounded-xl" style={{ background: "#FFFFFF", width: 420, maxWidth: "90vw", padding: 22 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Rename template</h3>
            <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Template name"
              style={{ width: "100%", marginTop: 14, fontSize: 13, color: "#0F172A", padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 8, outline: "none", background: "#FFFFFF" }} />
            <div className="flex justify-end gap-2" style={{ marginTop: 18 }}>
              <button type="button" onClick={() => setRenameId(null)} disabled={renaming} style={{ fontSize: 12, fontWeight: 500, color: "#64748B", background: "#F1F5F9", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={renaming || !renameValue.trim()} style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: "#2563EB", border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer", opacity: renaming || !renameValue.trim() ? 0.6 : 1 }}>{renaming ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

/** Dashed starter card — opens the editor on a fresh template. */
function BlankDraftCard({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl flex flex-col items-center justify-center text-center"
      style={{ minHeight: 360, background: "#FFFFFF", border: "1.5px dashed var(--border)", cursor: "pointer", fontFamily: font, transition: "border-color .15s, background .15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.background = "#F8FAFF"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "#FFFFFF"; }}>
      <div className="rounded-full flex items-center justify-center" style={{ width: 46, height: 46, background: "#EFF6FF", marginBottom: 14 }}>
        <Pencil size={18} color="#2563EB" />
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Blank draft</span>
      <span style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>Create a blank draft from scratch</span>
    </button>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 w-full rounded text-left"
      style={{ padding: "7px 9px", fontSize: 13, color: danger ? "#DC2626" : "#0F172A", background: "transparent", cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? "#FEF2F2" : "#F1F5F9")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <Icon size={14} /> {label}
    </button>
  );
}

/** Beehiiv-style template card: tall content preview + name/menu footer. */
function TemplateCard({ t, detail, onOpen, onRename, onDuplicate, onDelete }: { t: Template; detail?: Template; onOpen: () => void; onRename: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const [menu, setMenu] = useState(false);
  const design = (detail?.design || {}) as Record<string, unknown>;
  const thumb = typeof design.thumbnail === "string" ? design.thumbnail : "";
  const html = detail?.htmlBody || "";
  return (
    <div className="rounded-xl flex flex-col" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
      <button onClick={onOpen} className="block text-left relative"
        style={{ height: 300, width: "100%", overflow: "hidden", background: "#FFFFFF", borderBottom: "1px solid var(--border)", borderTopLeftRadius: 12, borderTopRightRadius: 12, cursor: "pointer", padding: 0 }}>
        {thumb ? (
          <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0 }}>
            {/* Rendered at 2× then scaled to 0.5 so the body reads like a shrunk page. */}
            <div style={{ position: "absolute", top: 0, left: 0, width: "200%", transform: "scale(0.5)", transformOrigin: "top left", padding: "26px 28px", pointerEvents: "none" }}>
              <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginBottom: 10 }}>{fmtDate(t.updatedAt)}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 12 }}>{t.subjectDefault || t.name}</div>
              {html ? (
                <div className="nx-doc-html" style={{ fontSize: 14, lineHeight: 1.6, color: "#334155" }} dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 2 }}>
                  {[100, 96, 92, 98, 70, 88, 94].map((w, i) => <div key={i} style={{ height: 9, borderRadius: 5, background: "#EEF2F6", width: `${w}%` }} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </button>
      <div className="flex items-center justify-between gap-2" style={{ padding: "12px 14px" }}>
        <div style={{ minWidth: 0 }}>
          <p className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>{t.name}</p>
          <p className="truncate" style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>{t.category ? `${cap(t.category)} · ` : ""}Updated {fmtDate(t.updatedAt)}</p>
        </div>
        <div className="relative" style={{ flexShrink: 0 }}>
          <button onClick={() => setMenu((v) => !v)} title="More" className="flex items-center justify-center rounded-lg"
            style={{ width: 30, height: 30, color: "#64748B", background: menu ? "#F1F5F9" : "transparent", border: `1px solid ${menu ? "var(--border)" : "transparent"}`, cursor: "pointer" }}>
            <MoreVertical size={16} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0" style={{ zIndex: 40 }} onClick={() => setMenu(false)} />
              {/* Kebab sits in the footer at the card's bottom edge, so the menu always opens upward. */}
              <div className="absolute rounded-lg" style={{ right: 0, bottom: 36, zIndex: 50, width: 158, background: "#FFFFFF", border: "1px solid var(--border)", boxShadow: "0 8px 28px rgba(15,23,42,0.14)", padding: 4 }}>
                <MenuItem icon={Pencil} label="Edit" onClick={() => { setMenu(false); onOpen(); }} />
                <MenuItem icon={Type} label="Rename" onClick={() => { setMenu(false); onRename(); }} />
                <MenuItem icon={Copy} label="Duplicate" onClick={() => { setMenu(false); onDuplicate(); }} />
                <MenuItem icon={Trash2} label="Archive" danger onClick={() => { setMenu(false); onDelete(); }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type StyleSettings = { fontFamily: string; textColor: string; accent: string; background: string; contentWidth: number };
const DEFAULT_STYLE: StyleSettings = { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", textColor: "#1a2231", accent: "#2563eb", background: "#ffffff", contentWidth: 680 };

/** Beehiiv-style email-size gauge (warns near Gmail's ~102KB clip limit). */
function SizeGauge({ pct, kb }: { pct: number; kb: number }) {
  const offset = 126 - (126 * Math.min(pct, 100)) / 100;
  const color = pct > 90 ? "#DC2626" : pct > 60 ? "#D97706" : "#9CA3AF";
  return (
    <div className="hidden md:flex items-center gap-1.5" title={`Email size ~${kb.toFixed(0)}KB${pct >= 100 ? " — may be clipped by Gmail (102KB)" : ""}`}>
      <svg viewBox="-8 0 116 56" style={{ width: 26, height: 14 }} aria-hidden="true">
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E5E7EB" strokeWidth="10" strokeLinecap="round" />
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray="126" strokeDashoffset={offset} />
      </svg>
      <span style={{ fontSize: 11, color, fontVariantNumeric: "tabular-nums" }}>{kb.toFixed(0)}KB</span>
    </div>
  );
}

/* ---- Quick start templates ---------------------------------------------- */
// Premade newsletters that seed the editor. Images are HOSTED (Unsplash) so
// they render in the preview AND survive real email delivery (base64 would be
// stripped by Gmail/Outlook). The `html` is rendered by TipTap StarterKit tags.
export type QuickStart = { key: string; name: string; subject: string; tags: string[]; html: string; style?: Partial<StyleSettings> };

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

const QUICK_STARTS: QuickStart[] = [
  {
    key: "verde-home-retail", name: "Verde Home — Retail", subject: "Elevate the Everyday — New from Verde Home", tags: ["retail", "ecommerce"],
    style: { fontFamily: "Georgia, 'Times New Roman', serif", textColor: "#2b2b2b", accent: "#1f4938", background: "#faf8f3", contentWidth: 680 },
    html: `<p><em>Free shipping on orders over $75</em></p>
<h1>Elevate the Everyday</h1>
<p>Timeless pieces for a home you love.</p>
<img src="${img("1493809842364-78817add7ffb")}" alt="Verde Home styling">
<p><a href="#">Shop New Arrivals →</a></p>
<hr>
<h2>Featured Favorites</h2>
<img src="${img("1485955900006-10f4d324d411")}" alt="Sand Ceramic Vase">
<h3>Sand Ceramic Vase · $48</h3>
<p>Handcrafted with a natural, textural finish. <a href="#">Shop now →</a></p>
<img src="${img("1578749556568-bc2c40e68b61")}" alt="Forest Serving Bowl">
<h3>Forest Serving Bowl · $36</h3>
<p>Organic shape, everyday elegance. <a href="#">Shop now →</a></p>
<img src="${img("1538688525198-9b88f6f53126")}" alt="Verde Scented Candle">
<h3>Verde Scented Candle · $32</h3>
<p>Notes of eucalyptus, sage &amp; cedar. <a href="#">Shop now →</a></p>
<hr>
<h2>Thoughtful design. Made to last.</h2>
<img src="${img("1616486338812-3dadae4b4ace")}" alt="Verde Home interior">
<p>At Verde Home, we believe your home should be a reflection of what matters most. We curate timeless pieces with intention — crafted for beauty, function, and the moments in between.</p>
<p><a href="#">Learn more →</a></p>
<hr>
<h2>Loved by our community</h2>
<blockquote>★★★★★<br>"The quality is exceptional and the pieces elevate every corner of my home. I'm a customer for life."<br>— Jessica M.</blockquote>
<hr>
<p><strong>Free shipping</strong> on orders over $75&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Easy returns</strong> within 30 days&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Sustainable</strong> materials&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Secure checkout</strong></p>
<p><strong>Verde Home</strong> — be the first to know about new arrivals and exclusive offers. <a href="#">Sign up →</a></p>
<p>123 Greenway Ave, Portland, OR 97201&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#">Unsubscribe</a></p>`,
  },
  {
    key: "classic-editorial", name: "Classic Editorial", subject: "Inside the City's Most Stylish Spaces", tags: ["editorial", "design"],
    style: { fontFamily: "Georgia, 'Times New Roman', serif", textColor: "#1f1a17", accent: "#9a5b2c", background: "#fbf8f2", contentWidth: 660 },
    html: `<h1>The Nordiske — Issue 01</h1>
<p><em>Discover minimalist homes, visionary design, and the quiet soul of Scandinavian living.</em></p>
<img src="${img("1506905925346-21bda4d32df4")}" alt="Nordic landscape">
<h2>Hej from the North</h2>
<p>Welcome to the premiere issue of <strong>Nordiske Hum</strong> — your curated journal for modern Scandinavian living. Each edition brings you design that quietly leaves a mark: thoughtful, tactile, and built to last.</p>
<p>This week we tour three homes that prove restraint is its own kind of luxury, and sit down with the makers behind them.</p>
<blockquote>"Good design is as little design as possible." — Dieter Rams</blockquote>
<hr>
<p>Until next week,<br><strong>The Nordiske Team</strong></p>`,
  },
  {
    key: "featured-interview", name: "Featured Interview", subject: "Working Remotely While Traveling the World", tags: ["interview", "people"],
    style: { fontFamily: "system-ui, -apple-system, sans-serif", textColor: "#1f2430", accent: "#6d28d9", background: "#ffffff", contentWidth: 660 },
    html: `<h1>Ava Sinclair on Building a Career From Anywhere</h1>
<p><em>How a travel creator built a thriving career while exploring the world with her dog.</em></p>
<img src="${img("1494790108377-be9c29b29330")}" alt="Ava Sinclair">
<h2>Meet Ava</h2>
<p>Ava Sinclair is a remote content creator who left a traditional 9-to-5 after realizing she didn't have to choose between work and adventure. Five years later, she's still on the road.</p>
<h3>On finding balance</h3>
<p>"Some weeks I work from a café in Lisbon, others from a cabin in the mountains. The secret isn't the location — it's the rhythm."</p>
<blockquote>You're reading <strong>Off Script</strong> — a slow newsletter about working and living a little differently.</blockquote>`,
  },
  {
    key: "tech-roundup", name: "Tech Roundup", subject: "SF Weekly Pulse: Issue 02", tags: ["tech", "news"],
    style: { fontFamily: "system-ui, -apple-system, sans-serif", textColor: "#0f172a", accent: "#2563eb", background: "#f6f9fc", contentWidth: 680 },
    html: `<h1>SF Weekly Pulse — Issue 02</h1>
<p><em>Another big week in San Francisco's tech ecosystem — funding, deadlines, and what's next.</em></p>
<img src="${img("1498050108023-c5249f4df085")}" alt="Workspace">
<h2>📌 Upcoming Deadlines</h2>
<ul>
<li><strong>TechCrunch Disrupt Battlefield</strong> — pitch for a chance at $100,000 in funding. Applications close April 15.</li>
<li><strong>AI for Good Global Summit</strong> — $350,000 available for projects addressing global challenges.</li>
</ul>
<h2>Stay Inspired</h2>
<p>Generative AI is showing up in unexpected places:</p>
<ul>
<li><strong>Healthcare:</strong> personalized treatment plans now piloted at 67% of major hospitals.</li>
<li><strong>Creative industries:</strong> AI drafting first cuts for film, music, and design.</li>
</ul>`,
  },
  {
    key: "community-pulse", name: "Community Pulse", subject: "This week in Stride — new faces, tips & a coffee run", tags: ["community", "events"],
    style: { fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", textColor: "#1f2937", accent: "#ea6a1e", background: "#fff8f1", contentWidth: 660 },
    html: `<h1>This Week in Stride</h1>
<p><em>Catch up on upcoming meetups, training hacks, and Kyle's 10K milestone.</em></p>
<h2>Hey runners — here's what's happening</h2>
<p>We've got fresh faces, new routes, and some serious miles ahead. Whether you're chasing a PR or just getting started, there's something here for you.</p>
<img src="${img("1529156069898-49953e39b3ac")}" alt="Community run">
<h3>Neighborhood runs &amp; meetups</h3>
<ul>
<li><strong>Tuesday</strong> — Riverside easy 5K · 6:30pm</li>
<li><strong>Saturday</strong> — Hill repeats + coffee · 8:00am</li>
</ul>
<p>See you out there,<br><strong>The Stride Crew</strong></p>`,
  },
  {
    key: "style-edit", name: "The Style Edit", subject: "Everything in Fashion This Week", tags: ["fashion", "lifestyle"],
    style: { fontFamily: "Georgia, 'Times New Roman', serif", textColor: "#1a1115", accent: "#d6276e", background: "#fdf2f7", contentWidth: 640 },
    html: `<h1>The Style Edit</h1>
<p><em>From effortless streetwear to red-carpet moments — here's what we're obsessed with.</em></p>
<img src="${img("1483985988355-763728e1935b")}" alt="Fashion rack">
<h2>This week's obsessions</h2>
<ul>
<li>The return of the tailored trench</li>
<li>Quiet luxury, louder accessories</li>
<li>Five capsule pieces worth the splurge</li>
</ul>
<blockquote>Style is a way to say who you are without having to speak.</blockquote>`,
  },
  {
    key: "wellness-reset", name: "Health & Wellness", subject: "Spring Cleaning for Your Health", tags: ["health", "wellness"],
    style: { fontFamily: "system-ui, -apple-system, sans-serif", textColor: "#133a2e", accent: "#0f9d6e", background: "#edfbf4", contentWidth: 660 },
    html: `<h1>Spring Cleaning for Your Health</h1>
<p><em>Small resets that make a big difference this season.</em></p>
<img src="${img("1476480862126-209bfaa8edc8")}" alt="Forest trail">
<h2>Three resets to try this week</h2>
<ul>
<li><strong>Move daily:</strong> a 20-minute walk still counts.</li>
<li><strong>Hydrate first:</strong> a glass of water before your coffee.</li>
<li><strong>Wind down:</strong> screens off 30 minutes before bed.</li>
</ul>
<p>Be well,<br><strong>The Wellness Desk</strong></p>`,
  },
];

/** Premade newsletter card — clicking seeds the editor with this content. */
function QuickStartCard({ qs, onUse }: { qs: QuickStart; onUse: () => void }) {
  const [menu, setMenu] = useState(false);
  const st = qs.style ?? {};
  const previewStyle = {
    position: "absolute", top: 0, left: 0, width: "200%", transform: "scale(0.5)", transformOrigin: "top left",
    padding: "26px 28px", pointerEvents: "none", fontSize: 14, lineHeight: 1.6,
    color: st.textColor ?? "#334155", fontFamily: st.fontFamily,
    ["--nx-head"]: st.textColor ?? "#0F172A", ["--nx-accent"]: st.accent ?? "#2563EB", ["--nx-rule"]: st.accent ? `${st.accent}33` : "#E2E8F0",
  } as React.CSSProperties;
  return (
    <div className="rounded-xl flex flex-col" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
      <button onClick={onUse} className="block text-left relative"
        style={{ height: 300, width: "100%", overflow: "hidden", background: st.background ?? "#FFFFFF", borderBottom: "1px solid var(--border)", borderTopLeftRadius: 12, borderTopRightRadius: 12, cursor: "pointer", padding: 0 }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <div className="nx-doc-html" style={previewStyle} dangerouslySetInnerHTML={{ __html: qs.html }} />
        </div>
      </button>
      <div className="flex items-center justify-between gap-2" style={{ padding: "12px 14px" }}>
        <div style={{ minWidth: 0 }}>
          <p className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>{qs.name}</p>
          <p className="truncate" style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>{qs.tags.map(cap).join(" · ")}</p>
        </div>
        <div className="relative" style={{ flexShrink: 0 }}>
          <button onClick={() => setMenu((v) => !v)} title="More" className="flex items-center justify-center rounded-lg"
            style={{ width: 30, height: 30, color: "#64748B", background: menu ? "#F1F5F9" : "transparent", border: `1px solid ${menu ? "var(--border)" : "transparent"}`, cursor: "pointer" }}>
            <MoreVertical size={16} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0" style={{ zIndex: 40 }} onClick={() => setMenu(false)} />
              <div className="absolute rounded-lg" style={{ right: 0, bottom: 36, zIndex: 50, width: 168, background: "#FFFFFF", border: "1px solid var(--border)", boxShadow: "0 8px 28px rgba(15,23,42,0.14)", padding: 4 }}>
                <MenuItem icon={Sparkles} label="Use this template" onClick={() => { setMenu(false); onUse(); }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const STYLE_FONTS = [
  { label: "Helvetica (sans)", val: "Helvetica Neue, Helvetica, Arial, sans-serif" },
  { label: "Georgia (serif)", val: "Georgia, 'Times New Roman', serif" },
  { label: "System", val: "system-ui, -apple-system, sans-serif" },
  { label: "Monospace", val: "'JetBrains Mono', monospace" },
];

// Hoisted to module scope: a stable component identity so editing a control
// (e.g. dragging the color picker) does NOT remount the row and close it.
function StyleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>{children}
    </div>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  // The input is UNCONTROLLED (defaultValue, not value). A controlled
  // <input type=color> loops forever during a native-picker drag: committed
  // state lags the live DOM value, so every re-render writes the stale value
  // back into the input, interrupting the drag and firing another input
  // event -> "Maximum update depth exceeded". Uncontrolled = React never
  // writes value back, so there's no fight. A local `shown` drives the label.
  const v = /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : "#000000";
  const [shown, setShown] = useState(v);
  return (
    <span className="flex items-center gap-2">
      <span style={{ fontSize: 12, color: "#94A3B8", fontVariantNumeric: "tabular-nums", textTransform: "uppercase" }}>{shown}</span>
      <input type="color" defaultValue={v} onChange={(e) => { setShown(e.target.value); onChange(e.target.value); }} style={{ width: 36, height: 26, border: "1px solid var(--border)", borderRadius: 6, background: "none", cursor: "pointer", padding: 0 }} />
    </span>
  );
}

/** Style tab — global look (font, colors, width) applied to the template. */
function StylePanel({ value, onChange }: { value: StyleSettings; onChange: (s: StyleSettings) => void }) {
  const set = (patch: Partial<StyleSettings>) => onChange({ ...value, ...patch });
  return (
    <div className="mx-auto px-5" style={{ maxWidth: 480, paddingTop: 40, fontFamily: font }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>Style</h2>
      <p style={{ fontSize: 12.5, color: "#64748B", margin: "2px 0 16px" }}>Global look for this template.</p>
      <div className="rounded-xl px-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
        <StyleRow label="Font">
          <select value={value.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })} style={{ fontSize: 13, padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", color: "#0F172A" }}>
            {STYLE_FONTS.map((f) => <option key={f.val} value={f.val}>{f.label}</option>)}
          </select>
        </StyleRow>
        <StyleRow label="Text color"><ColorField value={value.textColor} onChange={(c) => set({ textColor: c })} /></StyleRow>
        <StyleRow label="Accent / links"><ColorField value={value.accent} onChange={(c) => set({ accent: c })} /></StyleRow>
        <StyleRow label="Background"><ColorField value={value.background} onChange={(c) => set({ background: c })} /></StyleRow>
        <StyleRow label={`Content width — ${value.contentWidth}px`}>
          <input type="range" min={480} max={820} step={20} value={value.contentWidth} onChange={(e) => set({ contentWidth: Number(e.target.value) })} style={{ width: 150 }} />
        </StyleRow>
      </div>
      <div className="rounded-xl p-5 mt-4" style={{ background: value.background, border: "1px solid var(--border)", fontFamily: value.fontFamily, color: value.textColor }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 8, letterSpacing: "0.05em" }}>PREVIEW</p>
        <h3 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Your subject headline</h3>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>This is how your email body reads. <span style={{ color: value.accent, textDecoration: "underline" }}>Links use the accent color.</span></p>
      </div>
    </div>
  );
}

function TemplateEditor({ id, seed, onClose, onSaved }: { id: number | null; seed?: QuickStart | null; onClose: () => void; onSaved: (savedId?: number) => void }) {
  const [name, setName] = useState(seed?.name ?? "");
  const [subject, setSubject] = useState(seed?.subject ?? "");
  const [body, setBody] = useState(seed?.html ?? "");
  const [editorDoc, setEditorDoc] = useState<unknown>(null);
  const [thumbnail, setThumbnail] = useState<string>("");
  const [tags, setTags] = useState<string[]>(seed?.tags ?? []);
  const [style, setStyle] = useState<StyleSettings>({ ...DEFAULT_STYLE, ...(seed?.style ?? {}) });
  const [tab, setTab] = useState<"write" | "style">("write");
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [savedState, setSavedState] = useState<"synced" | "saving" | "unsaved">("synced");
  const skipFirstEdit = useRef(true);
  const thumbRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id == null) return;
    getTemplate(id).then((t) => {
      if (t) {
        setName(t.name); setSubject(t.subjectDefault || ""); setBody(t.htmlBody || "");
        const d = (t.design || {}) as Record<string, unknown>;
        setEditorDoc(d.doc ?? null); setThumbnail((d.thumbnail as string) || ""); setTags((d.tags as string[]) || []);
        setStyle({ ...DEFAULT_STYLE, ...((d.style as Partial<StyleSettings>) || {}) });
      }
      setLoading(false);
    });
  }, [id]);

  // Autosave (existing templates) — debounced PATCH after edits stop.
  useEffect(() => {
    if (loading) return;
    if (skipFirstEdit.current) { skipFirstEdit.current = false; return; }
    if (id == null) { setSavedState("unsaved"); return; } // new template saves on Create
    setSavedState("unsaved");
    const t = setTimeout(async () => {
      setSavedState("saving");
      const ok = await updateTemplate(id, { name: name.trim() || "Untitled template", subjectDefault: subject.trim(), htmlBody: body, design: { doc: editorDoc, thumbnail, tags, style } });
      setSavedState(ok ? "synced" : "unsaved");
    }, 1200);
    return () => clearTimeout(t);
  }, [name, subject, body, editorDoc, thumbnail, tags, style, id, loading]);

  const save = async () => {
    if (!name.trim()) { alert("Template name is required."); return; }
    setBusy(true);
    const payload = { name: name.trim(), subjectDefault: subject.trim(), htmlBody: body, design: { doc: editorDoc, thumbnail, tags, style } };
    let ok = false; let savedId = id ?? undefined;
    if (id != null) { ok = await updateTemplate(id, payload); }
    else { const res = await createTemplate(payload); ok = res.ok; savedId = res.id; }
    setBusy(false);
    if (ok) { setSavedState("synced"); onSaved(savedId); } else alert("Save failed.");
  };

  const wordCount = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const sizeBytes = typeof window !== "undefined" ? new Blob([body]).size : body.length;
  const sizePct = Math.min(100, (sizeBytes / 102400) * 100); // Gmail clips ~102KB
  const sync = busy ? "saving" : savedState;
  const syncLabel = sync === "saving" ? "Saving…" : sync === "unsaved" ? "Unsaved" : "Synced";
  const syncColor = sync === "saving" ? "#94A3B8" : sync === "unsaved" ? "#D97706" : "#22C55E";

  const onPickThumb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { const r = new FileReader(); r.onload = () => setThumbnail(r.result as string); r.readAsDataURL(f); }
    e.target.value = "";
  };
  const addTag = () => { const t = tagInput.trim(); if (t && !tags.includes(t)) setTags([...tags, t]); setTagInput(""); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#FFFFFF", fontFamily: font }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 shrink-0" style={{ height: 56, borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} title="Close" className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, color: "#64748B", background: "#F1F5F9", cursor: "pointer" }}><X size={16} /></button>
          <div className="flex items-center gap-2 rounded-md px-2.5 py-1" style={{ background: "#F1F5F9", fontSize: 12, color: "#64748B" }}>
            <span style={{ fontWeight: 500 }}>Draft</span>
            <span style={{ color: "#CBD5E1" }}>|</span>
            <span className="flex items-center gap-1.5" style={{ color: syncColor }}>{syncLabel}<span style={{ width: 7, height: 7, borderRadius: 999, background: syncColor }} /></span>
          </div>
        </div>
        <div className="hidden md:flex gap-1 p-1 rounded-lg" style={{ background: "#F1F5F9" }}>
          {(["write", "style"] as const).map((tk) => (
            <button key={tk} onClick={() => setTab(tk)} style={{ fontSize: 12, fontWeight: 500, padding: "5px 18px", borderRadius: 6, textTransform: "capitalize", background: tab === tk ? "#FFFFFF" : "transparent", color: tab === tk ? "#0F172A" : "#64748B", border: tab === tk ? "1px solid var(--border)" : "1px solid transparent", cursor: "pointer", fontFamily: font }}>{tk}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <SizeGauge pct={sizePct} kb={sizeBytes / 1024} />
          <span className="hidden md:inline" style={{ fontSize: 12, color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>{wordCount} words</span>
          <button onClick={onClose} disabled={busy} style={{ fontSize: 13, fontWeight: 500, color: "#64748B", background: "transparent", border: "none", padding: "7px 12px", cursor: "pointer" }}>Cancel</button>
          <button onClick={save} disabled={busy || loading} style={{ fontSize: 13, fontWeight: 500, color: "#FFFFFF", background: "#0F172A", border: "none", padding: "7px 18px", borderRadius: 8, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : id != null ? "Save" : "Create"}</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto" style={{ background: tab === "write" ? style.background : "#F8FAFC" }}>
        {loading ? (
          <p style={{ fontSize: 13, color: "#94A3B8", padding: 40, textAlign: "center" }}>Loading…</p>
        ) : tab === "style" ? (
          <StylePanel value={style} onChange={setStyle} />
        ) : (
          <div className="mx-auto px-5" style={{ maxWidth: style.contentWidth, paddingTop: 32, color: style.textColor, fontFamily: style.fontFamily }}>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {!thumbnail && (
                <button onClick={() => thumbRef.current?.click()} className="flex items-center gap-1.5" style={{ fontSize: 13, color: "#94A3B8", background: "transparent", border: "none", cursor: "pointer", fontFamily: font }}><ImageIcon size={14} /> Add thumbnail</button>
              )}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag size={13} color="#94A3B8" />
                {tags.map((tg) => (
                  <span key={tg} className="flex items-center gap-1 rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontWeight: 500, background: `${style.accent}1A`, color: style.accent }}>{tg}<button onClick={() => setTags(tags.filter((x) => x !== tg))} style={{ cursor: "pointer", color: "inherit", display: "flex" }}><X size={10} /></button></span>
                ))}
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder={tags.length ? "add tag" : "Add content tags"}
                  style={{ fontSize: 13, border: "none", outline: "none", background: "transparent", color: "#94A3B8", width: 130, fontFamily: font }} />
              </div>
              <input ref={thumbRef} type="file" accept="image/*" hidden onChange={onPickThumb} />
            </div>

            {thumbnail && (
              <div className="relative mb-5">
                <img src={thumbnail} alt="" style={{ width: "100%", borderRadius: 12, maxHeight: 300, objectFit: "cover", display: "block" }} />
                <button onClick={() => setThumbnail("")} title="Remove thumbnail" className="absolute flex items-center justify-center rounded-full" style={{ top: 10, right: 10, width: 26, height: 26, background: "rgba(15,23,42,0.6)", color: "#fff", cursor: "pointer", border: "none" }}><X size={14} /></button>
              </div>
            )}

            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Untitled template"
              style={{ width: "100%", fontSize: 11, fontWeight: 600, color: "#94A3B8", border: "none", outline: "none", background: "transparent", marginBottom: 14, fontFamily: font, letterSpacing: "0.05em", textTransform: "uppercase" }} />
            <textarea value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Add a subject line" rows={1}
              ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
              onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
              style={{ width: "100%", fontSize: 36, fontWeight: 700, color: style.textColor, border: "none", outline: "none", background: "transparent", resize: "none", lineHeight: 1.15, letterSpacing: "-0.02em", fontFamily: style.fontFamily, marginBottom: 14, overflow: "hidden" }} />
            <RichTextEditor value={body} onChange={(html, json) => { setBody(html); setEditorDoc(json); }} placeholder="Start writing your email…" bare />
          </div>
        )}
      </div>
    </div>
  );
}
