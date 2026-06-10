const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

const Bar = ({ w, h = 12, r = 6 }: { w: number | string; h?: number; r?: number }) => (
  <div className="animate-pulse" style={{ width: w, height: h, borderRadius: r, background: "#E2E8F0", flexShrink: 0 }} />
);

export default function Loading() {
  return (
    <div className="p-6 space-y-4" style={{ fontFamily: font }}>
      {/* sub-tabs */}
      <div className="flex gap-2">
        {[96, 56, 78].map((w, i) => <Bar key={i} w={w} h={28} r={8} />)}
      </div>
      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Bar w={220} h={34} r={8} />
        {[44, 60, 56, 92].map((w, i) => <Bar key={i} w={w} h={30} r={999} />)}
        <div className="flex-1" />
        <Bar w={110} h={30} r={8} />
      </div>
      {/* result count */}
      <Bar w={210} h={12} />
      {/* table */}
      <div className="rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
        <div style={{ background: "#F8FAFC", borderBottom: "1px solid var(--border)", padding: "11px 14px" }}>
          <Bar w={130} h={10} />
        </div>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4" style={{ height: 56, borderBottom: "1px solid #F8FAFC" }}>
            <Bar w={28} h={28} r={999} />
            <div className="flex-1 flex flex-col gap-1.5">
              <Bar w={150} h={11} />
              <Bar w={190} h={9} />
            </div>
            <Bar w={58} h={18} r={999} />
            <Bar w={72} h={11} />
            <Bar w={72} h={11} />
            <Bar w={64} h={18} r={999} />
          </div>
        ))}
      </div>
    </div>
  );
}
