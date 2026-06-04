"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useState } from "react";
import { mockSummary } from "@/lib/mock/customers";

interface FiltersProps {
  query: string;
  onQueryChange: (v: string) => void;
  active: Set<string>;
  onToggle: (flag: string) => void;
}

const chips: Array<{ key: string; label: string; count: number; variant: "vip" | "warn" | "info" | "muted" }> = [
  { key: "vip",         label: "VIP",            count: mockSummary.vip,         variant: "vip" },
  { key: "at_risk",     label: "At risk",        count: mockSummary.atRisk,      variant: "warn" },
  { key: "new",         label: "New (30d)",      count: mockSummary.newLast30,   variant: "info" },
  { key: "has_refund",  label: "Has refund",     count: mockSummary.hasRefund,   variant: "muted" },
  { key: "subscribed",  label: "Subscribed",     count: mockSummary.subscribed,  variant: "muted" },
  { key: "unsubscribed",label: "Unsubscribed",   count: mockSummary.unsubscribed,variant: "muted" },
];

export function CustomerFilters({ query, onQueryChange, active, onToggle }: FiltersProps) {
  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, phone…"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
          />
        </div>
        <select className="text-sm border border-input rounded-md px-3 py-1.5 h-9 bg-background">
          <option>All channels</option>
          <option>Shopify</option>
          <option>POS</option>
        </select>
        <select className="text-sm border border-input rounded-md px-3 py-1.5 h-9 bg-background">
          <option>Sort: Last activity</option>
          <option>Sort: Lifetime spend</option>
          <option>Sort: First order</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map(c => (
          <button key={c.key} onClick={() => onToggle(c.key)}>
            <Badge
              variant={active.has(c.key) ? c.variant : "outline"}
              className={`cursor-pointer ${active.has(c.key) ? "ring-2 ring-offset-1 ring-primary/30" : ""}`}
            >
              {c.label} · {c.count}
            </Badge>
          </button>
        ))}
        <button className="text-xs text-muted-foreground underline ml-2">+ Add filter</button>
      </div>
    </Card>
  );
}
