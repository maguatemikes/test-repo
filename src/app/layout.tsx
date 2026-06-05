// import { ClerkProvider } from "@clerk/nextjs"; // ← Re-enable when Clerk keys are set
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM",
  description: "Customer relationship management and email marketing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Clerk is temporarily disabled for local UI preview without real keys.
  // To re-enable:
  //   1. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY in .env.local
  //   2. Uncomment the ClerkProvider import above
  //   3. Wrap <html>…</html> in <ClerkProvider>…</ClerkProvider> below
  //   4. Restore middleware.ts (rename middleware.ts.disabled back)
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
