import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      className="flex size-full flex-col items-center justify-center gap-3"
      style={{ background: "var(--background)", fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}
    >
      <Loader2 className="animate-spin" size={28} style={{ color: "#2563EB" }} />
      <p style={{ fontSize: 13, color: "#64748B" }}>Loading…</p>
    </div>
  );
}
