"use client";

import { useEffect, useRef, useState } from "react";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

type Field = { id?: string; name?: string; type: string; label: string; required?: boolean; options?: string[] };
type Design = { accentColor?: string; submitText?: string; title?: string; description?: string } | null;
type Success = { action?: string; message?: string; redirectUrl?: string } | null;

export function HostedForm({
  slug, name, fields, design, success, embed = false,
}: { slug: string; name: string; fields: Field[]; design: Design; success: Success; embed?: boolean }) {
  const accent = design?.accentColor || "#2563EB";
  const title = design?.title || name;
  const description = design?.description || "Subscribe to get the latest updates.";
  const submitText = design?.submitText || "Subscribe →";
  const safeFields = (fields && fields.length ? fields : [{ type: "email", label: "Email", required: true }]) as Field[];

  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  // In embed mode, report the CARD height (not body, which is height:100%) so
  // the parent iframe injected by embed.js can auto-resize to fit the content.
  useEffect(() => {
    if (!embed) return;
    const el = cardRef.current;
    if (!el) return;
    const post = () =>
      window.parent?.postMessage({ type: "crm-form-height", slug, height: el.offsetHeight + 16 }, "*");
    post();
    // Repeat a few times so the parent's listener catches the height even if it
    // attaches slightly after the iframe's initial render.
    const timers = [120, 400, 1000].map((ms) => window.setTimeout(post, ms));
    const ro = new ResizeObserver(post);
    ro.observe(el);
    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
    };
  }, [embed, slug, state]);

  const keyFor = (f: Field, i: number) => f.id || f.name || `f${i}`;
  const set = (k: string, v: string | boolean) => setValues((p) => ({ ...p, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading"); setError("");

    // Derive email + displayName from the configured fields.
    let email = "";
    const nameParts: string[] = [];
    safeFields.forEach((f, i) => {
      const v = values[keyFor(f, i)];
      if (f.type === "email" && typeof v === "string") email = v;
      if (f.type === "text" && /name/i.test(f.label) && typeof v === "string" && v) nameParts.push(v);
    });

    try {
      const res = await fetch(`/api/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName: nameParts.join(" ") || undefined, fields: values }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
      if (success?.action === "redirect" && success.redirectUrl) {
        window.location.href = success.redirectUrl;
        return;
      }
      setState("success");
    } catch (err) {
      setError((err as Error).message); setState("error");
    }
  }

  return (
    <div style={{ minHeight: embed ? "auto" : "100vh", display: "flex", alignItems: embed ? "flex-start" : "center", justifyContent: "center", padding: embed ? 6 : 16, background: embed ? "transparent" : "var(--background)", fontFamily: font }}>
      <div ref={cardRef} style={{ width: "100%", maxWidth: 420, background: "#FFFFFF", borderRadius: 12, border: "1px solid var(--border)", boxShadow: embed ? "none" : "0 8px 28px rgba(15,23,42,0.08)", overflow: "hidden" }}>
        <div style={{ height: 6, background: accent }} />
        <div style={{ padding: 28 }}>
          {state === "success" ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 34 }}>🎉</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: "10px 0 6px" }}>{success?.message || "You're subscribed!"}</h2>
              <p style={{ fontSize: 13, color: "#64748B" }}>Thanks for signing up.</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{title}</h2>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 18 }}>{description}</p>

              <form onSubmit={onSubmit}>
                {safeFields.map((f, i) => {
                  const k = keyFor(f, i);
                  const common = { width: "100%", boxSizing: "border-box" as const, fontSize: 14, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, outline: "none", marginBottom: 14, fontFamily: font };
                  if (f.type === "checkbox") {
                    return (
                      <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", marginBottom: 14 }}>
                        <input type="checkbox" required={f.required} checked={!!values[k]} onChange={(e) => set(k, e.target.checked)} /> {f.label}
                      </label>
                    );
                  }
                  return (
                    <div key={k}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", display: "block", marginBottom: 6 }}>
                        {f.label}{f.required && <span style={{ color: "#DC2626" }}> *</span>}
                      </label>
                      {f.type === "textarea" ? (
                        <textarea required={f.required} value={(values[k] as string) || ""} onChange={(e) => set(k, e.target.value)} rows={3} style={{ ...common, resize: "vertical" }} />
                      ) : f.type === "select" ? (
                        <select required={f.required} value={(values[k] as string) || ""} onChange={(e) => set(k, e.target.value)} style={common}>
                          <option value="">Select…</option>
                          {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"} required={f.required}
                          value={(values[k] as string) || ""} onChange={(e) => set(k, e.target.value)} placeholder={f.label} style={common} />
                      )}
                    </div>
                  );
                })}

                {state === "error" && <p style={{ fontSize: 12, color: "#DC2626", marginBottom: 12 }}>{error}</p>}

                <button type="submit" disabled={state === "loading"}
                  style={{ width: "100%", background: accent, color: "#FFFFFF", fontSize: 14, fontWeight: 600, padding: "11px 16px", border: "none", borderRadius: 8, cursor: "pointer", opacity: state === "loading" ? 0.7 : 1, fontFamily: font }}>
                  {state === "loading" ? "Submitting…" : submitText}
                </button>
                <p style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", marginTop: 12 }}>No spam. Unsubscribe anytime.</p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
