"use client";

/**
 * App-wide styled replacements for the native window.confirm / prompt / alert,
 * exposed as an imperative promise-based API so call sites stay terse:
 *
 *   const dlg = useDialog();
 *   if (!(await dlg.confirm({ title: "Delete?", danger: true }))) return;
 *   const name = await dlg.prompt({ title: "New list", label: "Name", required: true });
 *   dlg.toast("Save failed", "error");
 *
 * Mounted once in Providers, so every page under it can call useDialog().
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

type ConfirmOpts = { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
type PromptOpts = { title: string; message?: string; label?: string; placeholder?: string; defaultValue?: string; confirmLabel?: string; required?: boolean };
type ToastKind = "error" | "success" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type DialogApi = {
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  prompt: (o: PromptOpts) => Promise<string | null>;
  toast: (message: string, kind?: ToastKind) => void;
};

const Ctx = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDialog must be used within <DialogProvider>");
  return ctx;
}

let _toastId = 1;

const toastChrome: Record<ToastKind, { color: string; Icon: typeof AlertCircle }> = {
  error: { color: "#DC2626", Icon: AlertCircle },
  success: { color: "#16A34A", Icon: CheckCircle2 },
  info: { color: "#2563EB", Icon: Info },
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [promptState, setPromptState] = useState<(PromptOpts & { resolve: (v: string | null) => void }) | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirmState({ ...o, resolve })),
    [],
  );
  const prompt = useCallback(
    (o: PromptOpts) => new Promise<string | null>((resolve) => { setPromptValue(o.defaultValue ?? ""); setPromptState({ ...o, resolve }); }),
    [],
  );
  const toast = useCallback((message: string, kind: ToastKind = "error") => {
    const id = _toastId++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const closeConfirm = (v: boolean) => { confirmState?.resolve(v); setConfirmState(null); };
  const closePrompt = (v: string | null) => { promptState?.resolve(v); setPromptState(null); };

  const api = useMemo<DialogApi>(() => ({ confirm, prompt, toast }), [confirm, prompt, toast]);

  return (
    <Ctx.Provider value={api}>
      {children}

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title || ""}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        danger={confirmState?.danger}
        onConfirm={() => closeConfirm(true)}
        onCancel={() => closeConfirm(false)}
      />

      {promptState && (
        <div onClick={() => closePrompt(null)} className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(15,23,42,0.4)", fontFamily: font }}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); if (promptState.required && !promptValue.trim()) return; closePrompt(promptValue); }}
            className="rounded-xl"
            style={{ background: "#FFFFFF", width: 440, maxWidth: "90vw", padding: 22 }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{promptState.title}</h3>
            {promptState.message && <p style={{ fontSize: 12.5, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>{promptState.message}</p>}
            {promptState.label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#0F172A", margin: "14px 0 6px" }}>{promptState.label}</label>}
            <input
              autoFocus
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder={promptState.placeholder}
              style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, outline: "none", marginTop: promptState.label ? 0 : 14, fontFamily: font }}
            />
            <div className="flex justify-end gap-2" style={{ marginTop: 18 }}>
              <button type="button" onClick={() => closePrompt(null)} style={{ fontSize: 12, fontWeight: 500, color: "#64748B", background: "#F1F5F9", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
              <button type="submit" style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: "#2563EB", border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer" }}>{promptState.confirmLabel || "OK"}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 80, display: "flex", flexDirection: "column", gap: 8, fontFamily: font, pointerEvents: "none" }}>
        {toasts.map((t) => {
          const { color, Icon } = toastChrome[t.kind];
          return (
            <div key={t.id} className="rounded-lg flex items-start gap-2" style={{ minWidth: 240, maxWidth: 380, padding: "10px 12px", background: "#FFFFFF", border: "1px solid var(--border)", borderLeft: `3px solid ${color}`, boxShadow: "0 8px 28px rgba(15,23,42,0.14)", pointerEvents: "auto" }}>
              <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12.5, color: "#0F172A", lineHeight: 1.45, flex: 1 }}>{t.message}</span>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer", display: "flex", flexShrink: 0 }}><X size={13} /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
