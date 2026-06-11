/**
 * MOCK content/templates store (localStorage-backed) — stand-in until the
 * backend ships `/api/templates`. Shared by the Content section and the
 * Campaign composer so a template created in one shows up in the other.
 *
 * Swap-out plan: replace these 3 functions with fetches to /api/templates;
 * the shape (MockTemplate) already matches the proposed Template resource.
 */
export type MockTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string; // simple HTML for the mock (real version = Unlayer designJson + contentHtml)
  updatedAt: string;
};

const KEY = "netx_mock_templates";

const SEED: MockTemplate[] = [
  { id: "tpl_welcome", name: "Welcome Email", subject: "Welcome to Acme 👋", body: "<h1>Welcome aboard!</h1><p>Thanks for joining — here's what to expect…</p>", updatedAt: "2026-06-01T10:00:00Z" },
  { id: "tpl_promo", name: "June Promo", subject: "Your June deals are here 🎉", body: "<h1>June Deals</h1><p>Save big across the store all month.</p>", updatedAt: "2026-06-05T10:00:00Z" },
  { id: "tpl_winback", name: "Win-back", subject: "We miss you — 20% off", body: "<h1>Come back!</h1><p>Here's 20% off your next order.</p>", updatedAt: "2026-06-08T10:00:00Z" },
];

export function getTemplates(): MockTemplate[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { localStorage.setItem(KEY, JSON.stringify(SEED)); return SEED; }
    return JSON.parse(raw) as MockTemplate[];
  } catch {
    return SEED;
  }
}

export function getTemplate(id: string): MockTemplate | undefined {
  return getTemplates().find((t) => t.id === id);
}

export function saveTemplate(input: { id?: string; name: string; subject: string; body: string }): MockTemplate[] {
  const all = getTemplates();
  const id = input.id || `tpl_${Date.now()}`;
  const rec: MockTemplate = { id, name: input.name, subject: input.subject, body: input.body, updatedAt: new Date().toISOString() };
  const idx = all.findIndex((t) => t.id === id);
  if (idx >= 0) all[idx] = rec; else all.unshift(rec);
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

export function deleteTemplate(id: string): MockTemplate[] {
  const all = getTemplates().filter((t) => t.id !== id);
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}
