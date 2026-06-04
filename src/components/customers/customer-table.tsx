"use client";

import Link from "next/link";
import type { CustomerSummary } from "@/types/customer";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, relativeDate } from "@/lib/utils";

function ChannelBadges({ channels }: { channels: CustomerSummary["channels"] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {channels.map(c => (
        <Badge key={c} variant="info" className="capitalize">{c}</Badge>
      ))}
    </div>
  );
}

function StatusFor({ flags }: { flags: CustomerSummary["flags"] }) {
  if (flags.includes("vip"))     return <Badge variant="vip">VIP</Badge>;
  if (flags.includes("at_risk")) return <Badge variant="warn">At risk</Badge>;
  if (flags.includes("new"))     return <Badge variant="info">New</Badge>;
  return <Badge variant="muted">Subscribed</Badge>;
}

export function CustomerTable({ customers }: { customers: CustomerSummary[] }) {
  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between text-xs text-muted-foreground">
        <div>Showing <strong className="text-foreground">{customers.length}</strong> of 2,431 customers</div>
        <div className="space-x-2">
          Bulk:
          <button className="text-primary underline">Tag</button>
          <span>·</span>
          <button className="text-primary underline">Add to list</button>
          <span>·</span>
          <button className="text-primary underline">Suppress</button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"><input type="checkbox" /></TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Channels</TableHead>
            <TableHead className="text-right">Lifetime spend</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead>Last order</TableHead>
            <TableHead>Last engagement</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map(c => (
            <TableRow key={c.id} className="cursor-pointer">
              <TableCell><input type="checkbox" /></TableCell>
              <TableCell>
                <Link href={`/customers/${c.id}`} className="block">
                  <div className="font-medium">{c.displayName}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </Link>
              </TableCell>
              <TableCell><ChannelBadges channels={c.channels} /></TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(c.lifetimeSpend)}</TableCell>
              <TableCell className="text-right">{c.orderCount}</TableCell>
              <TableCell className="text-xs">{c.lastOrderAt ? relativeDate(c.lastOrderAt) : "—"}</TableCell>
              <TableCell className="text-xs">{c.lastEngagementAt ? relativeDate(c.lastEngagementAt) : "—"}</TableCell>
              <TableCell><StatusFor flags={c.flags} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="px-5 py-3 border-t flex items-center justify-between text-xs text-muted-foreground">
        <div>Page 1 of 487</div>
        <div className="flex gap-1">
          <button className="px-2 py-1 border rounded text-muted-foreground/60">Prev</button>
          <button className="px-2 py-1 border rounded">1</button>
          <button className="px-2 py-1 border rounded">2</button>
          <button className="px-2 py-1 border rounded">3</button>
          <span className="px-2 py-1">…</span>
          <button className="px-2 py-1 border rounded">Next</button>
        </div>
      </div>
    </div>
  );
}
