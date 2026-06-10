import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

/** Reusable empty state — icon + title + helpful copy + optional primary CTA. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding: compact ? "32px 20px" : "56px 24px", fontFamily: font }}>
      {Icon && (
        <div className="rounded-full flex items-center justify-center" style={{ width: compact ? 40 : 48, height: compact ? 40 : 48, background: "#EFF6FF", marginBottom: 14 }}>
          <Icon size={compact ? 18 : 22} color="#2563EB" />
        </div>
      )}
      <p style={{ fontSize: compact ? 13 : 15, fontWeight: 600, color: "#0F172A", marginBottom: description ? 4 : 0 }}>{title}</p>
      {description && (
        <p style={{ fontSize: 12.5, color: "#64748B", maxWidth: 340, lineHeight: 1.5, marginBottom: action ? 16 : 0 }}>{description}</p>
      )}
      {action}
    </div>
  );
}
