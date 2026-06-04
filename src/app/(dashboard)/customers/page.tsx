"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomerFilters } from "@/components/customers/customer-filters";
import { CustomerTable } from "@/components/customers/customer-table";
import { mockCustomers } from "@/lib/mock/customers";

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<string>>(new Set());

  const toggle = (k: string) => {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mockCustomers.filter(c => {
      if (active.size > 0 && ![...active].some(f => c.flags.includes(f as any))) return false;
      if (!q) return true;
      return c.displayName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    });
  }, [query, active]);

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Customers</div>
          <h1 className="text-2xl font-bold">All customers</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Import CSV</Button>
          <Button variant="outline">Export</Button>
          <Button>Add customer</Button>
        </div>
      </div>

      <CustomerFilters query={query} onQueryChange={setQuery} active={active} onToggle={toggle} />
      <CustomerTable customers={filtered} />
    </div>
  );
}
