import { EmptyState } from "@/components/empty-state";

export default function AnalyticsnalyticsPage() {
  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-5">
        <div className="text-xs text-muted-foreground mb-1">Section</div>
        <h1 className="text-2xl font-bold capitalize">analytics</h1>
      </div>
      <EmptyState
        title="Not built yet"
        description="This screen is part of Phase 1 scope. See the screen inventory doc in the handoff package for the spec."
        action={{ label: "View handoff README", href: "https://gitlab.internal" }}
      />
    </div>
  );
}
