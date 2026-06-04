"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, List, Filter, Mail, Workflow, FormInput,
  BarChart3, Settings, ChevronDown,
} from "lucide-react";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; right?: string };
type Group = { label?: string; items: Item[] };

const groups: Group[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Customers",
    items: [
      { href: "/customers", label: "All customers", icon: Users, right: "2,431" },
      { href: "/lists",     label: "Lists",         icon: List },
      { href: "/segments",  label: "Segments",      icon: Filter },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/campaigns",   label: "Campaigns",   icon: Mail },
      { href: "/automations", label: "Automations", icon: Workflow },
      { href: "/forms",       label: "Forms",       icon: FormInput },
    ],
  },
  {
    label: "Insight",
    items: [{ href: "/analytics", label: "Analytics", icon: BarChart3 }],
  },
  {
    label: "Admin",
    items: [{ href: "/settings/integrations", label: "Settings", icon: Settings }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-primary text-primary-foreground flex flex-col flex-shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center font-bold text-white">C</div>
        <div className="font-semibold tracking-tight">CRM</div>
      </div>

      {/* Org switcher */}
      <button className="mx-3 my-3 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-between text-xs">
        <span className="font-semibold truncate">Acme Goods</span>
        <ChevronDown className="w-3 h-3 text-white/60" />
      </button>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 text-sm overflow-y-auto">
        {groups.map((g, i) => (
          <div key={i}>
            {g.label && (
              <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/40">
                {g.label}
              </div>
            )}
            {g.items.map(item => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-white/70 hover:bg-white/5",
                    active && "bg-white/10 text-white"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.right && <span className="ml-auto text-[10px] text-white/40">{item.right}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
