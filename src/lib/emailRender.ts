/**
 * Render the editor's semantic HTML into email-safe HTML.
 *
 * Email clients (Gmail, Outlook) ignore <style>/classes and external CSS and
 * don't lay out with modern <div> rules, so the only reliable approach is a
 * fixed-width, table-based document with every style inlined. This walks the
 * editor's HTML and re-emits it that way, applying the template's Style
 * (font, text color, accent, background, width) so the inbox matches the
 * editor canvas.
 *
 * Runs client-side (DOMParser). If called without a DOM it returns the input
 * unchanged so SSR never throws.
 */
export type EmailStyle = {
  fontFamily: string;
  textColor: string;
  accent: string;
  /** The email body card the content sits on. */
  background: string;
  /** The page area around the body card. */
  pageBackground: string;
  contentWidth: number;
};

/** Marker on rendered output so re-rendering email HTML is a no-op (prevents
 *  double-rendering, which would flatten the tables and drop headings/images). */
const SENTINEL = "<!--nx-email-->";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => esc(s).replace(/"/g, "&quot;");

const HEAD: Record<number, { size: number; weight: number; mt: number; mb: number }> = {
  1: { size: 32, weight: 700, mt: 26, mb: 12 },
  2: { size: 24, weight: 700, mt: 24, mb: 10 },
  3: { size: 19, weight: 600, mt: 18, mb: 6 },
};

const pStyle = (s: EmailStyle) =>
  `margin:0 0 16px;font-family:${s.fontFamily};color:${s.textColor};font-size:16px;line-height:1.7;`;

/** Inline content (text + marks). <p>/<span> are treated as transparent so
 *  they can appear inside list items and blockquotes without nesting blocks. */
function inline(node: Node, s: EmailStyle): string {
  if (node.nodeType === 3) return esc(node.textContent || "");
  if (node.nodeType !== 1) return "";
  const el = node as HTMLElement;
  const kids = Array.from(el.childNodes).map((n) => inline(n, s)).join("");
  switch (el.tagName) {
    case "STRONG": case "B": return `<strong style="font-weight:700;">${kids}</strong>`;
    case "EM": case "I": return `<em style="font-style:italic;">${kids}</em>`;
    case "S": case "STRIKE": case "DEL": return `<s>${kids}</s>`;
    case "CODE": return `<code style="font-family:monospace;background:#f1f1f1;padding:1px 5px;border-radius:4px;font-size:14px;">${kids}</code>`;
    case "BR": return "<br>";
    case "A": {
      const href = el.getAttribute("href") || "#";
      return `<a href="${escAttr(href)}" style="color:${s.accent};text-decoration:underline;">${kids}</a>`;
    }
    default: return kids; // P, SPAN, anything else → just its content
  }
}

/** A top-level block → inlined email HTML. */
function block(node: Node, s: EmailStyle, width: number): string {
  if (node.nodeType === 3) {
    const t = (node.textContent || "").trim();
    return t ? `<p style="${pStyle(s)}">${esc(t)}</p>` : "";
  }
  if (node.nodeType !== 1) return "";
  const el = node as HTMLElement;
  const tag = el.tagName;
  if (/^H[123]$/.test(tag)) {
    const lvl = Number(tag[1]);
    const h = HEAD[lvl];
    return `<h${lvl} style="margin:${h.mt}px 0 ${h.mb}px;font-family:${s.fontFamily};color:${s.textColor};font-size:${h.size}px;line-height:1.25;font-weight:${h.weight};">${inline(el, s)}</h${lvl}>`;
  }
  switch (tag) {
    case "P":
      return `<p style="${pStyle(s)}">${inline(el, s) || "&nbsp;"}</p>`;
    case "UL": case "OL": {
      const t = tag === "UL" ? "ul" : "ol";
      const items = Array.from(el.children)
        .map((li) => `<li style="margin:0 0 6px;font-family:${s.fontFamily};color:${s.textColor};font-size:16px;line-height:1.7;">${inline(li, s)}</li>`)
        .join("");
      return `<${t} style="margin:0 0 16px;padding-left:24px;">${items}</${t}>`;
    }
    case "BLOCKQUOTE":
      return `<blockquote style="margin:0 0 16px;padding:6px 0 6px 16px;border-left:3px solid ${s.accent};font-family:${s.fontFamily};color:#666666;font-style:italic;font-size:16px;line-height:1.7;">${inline(el, s)}</blockquote>`;
    case "HR":
      return `<hr style="border:0;border-top:1px solid #e3e0da;margin:24px 0;">`;
    case "IMG": {
      const src = el.getAttribute("src") || "";
      if (!src) return "";
      const alt = el.getAttribute("alt") || "";
      const cw = width - 68; // body cell has 34px padding each side; size images to the content box so fixed-width clients (Outlook) don't overflow
      return `<img src="${escAttr(src)}" alt="${escAttr(alt)}" width="${cw}" style="display:block;width:100%;max-width:${cw}px;height:auto;border:0;border-radius:8px;margin:4px 0 16px;">`;
    }
    case "DIV":
      return Array.from(el.childNodes).map((n) => block(n, s, width)).join("");
    default: {
      const i = inline(el, s);
      return i ? `<p style="${pStyle(s)}">${i}</p>` : "";
    }
  }
}

export function renderEmailHtml(html: string, style: EmailStyle): string {
  if (!html) return "";
  if (html.includes(SENTINEL)) return html; // already email HTML — don't re-render
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;
  const parsed = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, "text/html");
  const width = Math.min(Math.max(Math.round(style.contentWidth || 640), 480), 700);
  const body = Array.from(parsed.body.childNodes).map((n) => block(n, style, width)).filter(Boolean).join("\n");
  const page = style.pageBackground || style.background;
  return `${SENTINEL}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;width:100%;background:${page};">
<tr><td align="center" style="padding:28px 14px;background:${page};">
<table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" style="width:${width}px;max-width:100%;background:${style.background};border-radius:12px;">
<tr><td style="padding:36px 34px;font-family:${style.fontFamily};color:${style.textColor};font-size:16px;line-height:1.7;text-align:left;">
${body}
</td></tr>
</table>
</td></tr>
</table>`;
}
