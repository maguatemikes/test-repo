import { EmptyState } from "@/components/empty-state";

export default function SettingsIntegrationsPage() {
  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-5">
        <div className="text-xs text-muted-foreground mb-1">Settings</div>
        <h1 className="text-2xl font-bold">Integrations</h1>
      </div>
      <EmptyState
        title="Settings → Integrations stub"
        description="Sending domain verification + connected ecommerce stores live here. See 04_Wireframes.html for the target layout."
      />
    </div>
  );
}
