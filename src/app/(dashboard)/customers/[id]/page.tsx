import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { mockCustomers } from "@/lib/mock/customers";
import { formatCurrency, initials } from "@/lib/utils";

export default function CustomerProfilePage({ params }: { params: { id: string } }) {
  const c = mockCustomers.find(c => c.id === params.id);
  if (!c) notFound();

  return (
    <div className="p-8 max-w-6xl">
      <Link href="/customers" className="text-xs text-muted-foreground hover:text-foreground mb-3 inline-block">
        ← Back to all customers
      </Link>
      <Card>
        <div className="p-6 border-b flex items-start gap-5">
          <Avatar initials={initials(c.displayName)} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold">{c.displayName}</h1>
              {c.isVip && <Badge variant="vip">VIP</Badge>}
              <Badge variant="success">Subscribed</Badge>
            </div>
            <div className="text-sm text-muted-foreground">{c.email}</div>
            <div className="text-xs text-muted-foreground mt-1">Customer · TODO: connect to real data</div>
          </div>
          <div className="flex flex-col gap-1">
            <Button variant="outline" size="sm">Edit</Button>
            <Button variant="outline" size="sm">Merge</Button>
            <Button variant="destructive" size="sm">Suppress</Button>
          </div>
        </div>
        <div className="grid grid-cols-5 divide-x">
          <div className="p-4">
            <div className="text-xs text-muted-foreground">Lifetime spend</div>
            <div className="text-lg font-bold">{formatCurrency(c.lifetimeSpend)}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-muted-foreground">Orders</div>
            <div className="text-lg font-bold">{c.orderCount}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-muted-foreground">AOV</div>
            <div className="text-lg font-bold">{formatCurrency(c.lifetimeSpend / Math.max(1, c.orderCount))}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-muted-foreground">Predicted CLV</div>
            <div className="text-lg font-bold text-muted-foreground">—</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-muted-foreground">Channels</div>
            <div className="flex gap-1 mt-1">
              {c.channels.map(ch => <Badge key={ch} variant="info" className="capitalize">{ch}</Badge>)}
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            Order history, engagement timeline, and addresses will be wired here once the API is in place.
          </p>
        </div>
      </Card>
    </div>
  );
}
