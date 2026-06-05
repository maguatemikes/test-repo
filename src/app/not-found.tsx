import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex size-full flex-col items-center justify-center gap-3"
      style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", background: "var(--background)" }}
    >
      <p style={{ fontSize: 48, fontWeight: 600, color: "#0F172A" }}>404</p>
      <p style={{ fontSize: 14, color: "#64748B" }}>This page could not be found.</p>
      <Link
        href="/"
        style={{ fontSize: 13, fontWeight: 500, color: "#FFFFFF", background: "#2563EB", padding: "8px 16px", borderRadius: 8 }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
