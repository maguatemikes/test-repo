"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { DialogProvider } from "@/components/ui/dialogProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <DialogProvider>{children}</DialogProvider>
    </ThemeProvider>
  );
}
