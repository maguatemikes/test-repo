const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

const Bar = ({ w, h = 12, r = 6 }: { w: number | string; h?: number; r?: number }) => (
  <div className="animate-pulse" style={{ width: w, height: h, borderRadius: r, background: "#E2E8F0", flexShrink: 0 }} />
);

export default function Loading() {
  return (
    <div className="p-6 space-y-4" style={{ fontFamily: font }}>
      <div className="flex items-center justify-between">
        <Bar w={180} h={14} />
        <Bar w={120} h={34} r={8} />
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <Bar w={32} h={32} r={8} />
              <Bar w={54} h={18} r={999} />
            </div>
            <Bar w={150} h={13} />
            <div className="mt-2 mb-4 flex flex-col gap-1.5">
              <Bar w={120} h={9} />
              <Bar w={90} h={9} />
            </div>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid #F1F5F9" }}>
              <Bar w={60} h={16} />
              <Bar w={70} h={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
