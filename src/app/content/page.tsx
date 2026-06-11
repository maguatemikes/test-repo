import Link from "next/link";
import { LayoutTemplate, FileText, ArrowRight } from "lucide-react";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

/**
 * Content hub — the CMS half of the app. Houses reusable email Templates
 * (the content campaigns + automations deliver) and Forms.
 */
export default function ContentPage() {
  return (
    <div className="p-6 space-y-6" style={{ fontFamily: font }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "#0F172A" }}>Content</h1>
        <p style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>
          Reusable templates and forms — the content your campaigns and automations deliver.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2" style={{ maxWidth: 760 }}>
        {/* Email Templates — backend not built yet */}
        <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid var(--border)", position: "relative" }}>
          <span className="rounded-full px-2 py-0.5" style={{ position: "absolute", top: 16, right: 16, fontSize: 10, fontWeight: 600, background: "#FEF3C7", color: "#B45309" }}>
            Coming soon
          </span>
          <div className="rounded-lg flex items-center justify-center" style={{ width: 40, height: 40, background: "#EFF6FF", marginBottom: 14 }}>
            <LayoutTemplate size={20} color="#2563EB" />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Email Templates</h3>
          <p style={{ fontSize: 12.5, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>
            Design a template once, then deliver it from any campaign or automation — content lives here, not inline.
          </p>
          <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 12 }}>
            Needs the <code style={{ fontFamily: "monospace", color: "#64748B" }}>/api/templates</code> backend (not built yet).
          </p>
        </div>

        {/* Forms — already live */}
        <Link href="/forms" className="rounded-xl p-5 block" style={{ background: "#FFFFFF", border: "1px solid var(--border)", textDecoration: "none" }}>
          <div className="rounded-lg flex items-center justify-center" style={{ width: 40, height: 40, background: "#F0FDF4", marginBottom: 14 }}>
            <FileText size={20} color="#16A34A" />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Forms</h3>
          <p style={{ fontSize: 12.5, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>
            Build sign-up and lead-capture forms, host them at a public link, and route submissions to lists.
          </p>
          <span className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 500, color: "#2563EB", marginTop: 12 }}>
            Open Forms <ArrowRight size={13} />
          </span>
        </Link>
      </div>
    </div>
  );
}
