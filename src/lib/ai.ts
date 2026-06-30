// Client helper for the AI content actions in the email editor.
// Talks only to our same-origin proxy (/api/ai/complete) — never to the
// provider directly; the OpenRouter key lives on crm-api. Verified contract:
//   request:  { action, input, tone? }   (instruction/source text → `input`)
//   response: { ok, requestId, text, usage }  (single JSON, not streamed)

export type AiAction = "generate" | "rewrite" | "expand" | "summarize" | "retone";

const FRIENDLY: Record<string, string> = {
  invalid_action: "That AI action isn't supported.",
  empty_input: "Nothing to send to AI — type or select some text first.",
};

/** Call the AI proxy and return the generated text. Throws a user-facing
 *  Error message on failure (rate limit, expired session, etc.). */
export async function aiComplete(action: AiAction, input: string, tone?: string): Promise<string> {
  const res = await fetch("/api/ai/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action, input, ...(tone ? { tone } : {}) }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean; text?: string; code?: string; error?: string; message?: string;
  };
  if (!res.ok || !data.ok) {
    if (res.status === 429) throw new Error("AI limit reached — give it a minute and try again.");
    if (res.status === 401) throw new Error("Your session expired — sign in again, then retry.");
    const code = data.code || data.error || "";
    throw new Error(FRIENDLY[code] || data.message || "AI request failed. Please try again.");
  }
  return (data.text || "").trim();
}

/** Convert the model's plain-text output into editor HTML: blank lines → new
 *  paragraphs, single newlines → <br>. Escapes HTML so output is inserted as
 *  text, not markup. */
export function aiTextToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
