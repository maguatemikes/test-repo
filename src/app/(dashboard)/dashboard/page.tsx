import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatCurrency } from "@/lib/utils";
import Link from "next/link";

const kpis = [
  { label: "Contacts",          value: formatNumber(2431),       delta: "↑ 4.2%",  positive: true },
  { label: "Sends this month",  value: formatNumber(8402),       delta: "of 25,000",positive: null, progress: 33.6 },
  { label: "Open rate",         value: "38.2%",                  delta: "↑ 1.4 pts",positive: true },
  { label: "Revenue attributed",value: formatCurrency(12840),    delta: "↑ 22.1%",  positive: true },
];

const recentCampaigns = [
  { name: "Spring Sale — 20% off",        when: "Sent 2h ago",       status: "sent",      recipients: 1204, open: "41.2%", click: "8.4%", rev: 4210 },
  { name: "VIP Restock Notification",     when: "Yesterday",         status: "sent",      recipients: 312,  open: "62.4%", click: "19.2%",rev: 2840 },
  { name: "Weekly newsletter — week 22",  when: "Scheduled Sat 9 AM",status: "scheduled", recipients: 2118, open: "—",     click: "—",    rev: null },
  { name: "Father's Day teaser",          when: "Draft · edited 1d", status: "draft",     recipients: null, open: "—",     click: "—",    rev: null },
];

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Acme Goods · Last 30 days</div>
          <h1 className="text-2xl font-bold">Good morning.</h1>
        </div>
        <Link href="/campaigns/new">
          <Button variant="accent">Compose campaign</Button>
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 pt-4">
              <div className="text-xs text-muted-foreground mb-2">{k.label}</div>
              <div className="text-2xl font-bold">{k.value}</div>
              <div className={`text-xs mt-1 ${k.positive === true ? "text-emerald-700" : "text-muted-foreground"}`}>
                {k.delta}
              </div>
              {k.progress !== undefined && (
                <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <div className="h-1 bg-primary rounded-full" style={{ width: `${k.progress}%` }} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent campaigns</CardTitle>
          <Link href="/campaigns" className="text-xs text-primary underline">View all</Link>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="text-left font-medium py-2">Campaign</th>
                <th className="text-left font-medium">Status</th>
                <th className="text-right font-medium">Recipients</th>
                <th className="text-right font-medium">Open</th>
                <th className="text-right font-medium">Click</th>
                <th className="text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentCampaigns.map(c => (
                <tr key={c.name}>
                  <td className="py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.when}</div>
                  </td>
                  <td>
                    {c.status === "sent"      && <Badge variant="success">Sent</Badge>}
                    {c.status === "scheduled" && <Badge variant="info">Scheduled</Badge>}
                    {c.status === "draft"     && <Badge variant="muted">Draft</Badge>}
                  </td>
                  <td className="text-right">{c.recipients ? formatNumber(c.recipients) : "—"}</td>
                  <td className="text-right font-medium">{c.open}</td>
                  <td className="text-right">{c.click}</td>
                  <td className="text-right font-medium">{c.rev ? formatCurrency(c.rev) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
