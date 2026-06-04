"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Topbar() {
  return (
    <header className="h-14 border-b bg-white flex items-center px-5 gap-3 flex-shrink-0">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 h-9" placeholder="Search customers, campaigns, segments…" />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button className="text-muted-foreground hover:text-foreground relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" />
        </button>
        <div className="w-px h-6 bg-border" />
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}
