"use client";

import { AlertTriangle } from "lucide-react";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

/** Reusable styled confirm — replaces native window.confirm(). */
export function ConfirmDialog({
  open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false, busy = false, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const accent = danger ? "#DC2626" : "#2563EB";
  return (
    <div onClick={onCancel} className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(15,23,42,0.4)", fontFamily: font }}>
      <div onClick={(e) => e.stopPropagation()} className="rounded-xl" style={{ background: "#FFFFFF", width: 420, maxWidth: "90vw", padding: 22 }}>
        <div className="flex items-start gap-3">
          {danger && (
            <div className="rounded-full flex items-center justify-center" style={{ width: 36, height: 36, background: "#FEF2F2", flexShrink: 0 }}>
              <AlertTriangle size={18} color="#DC2626" />
            </div>
          )}
          <div className="flex-1">
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{title}</h3>
            {message && <p style={{ fontSize: 12.5, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>{message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2" style={{ marginTop: 18 }}>
          <button onClick={onCancel} disabled={busy} style={{ fontSize: 12, fontWeight: 500, color: "#64748B", background: "#F1F5F9", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>{cancelLabel}</button>
          <button onClick={onConfirm} disabled={busy} style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", background: accent, border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Working…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
