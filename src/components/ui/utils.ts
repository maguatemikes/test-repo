// Re-export the shared `cn` helper so existing `./utils` imports keep working
// while shadcn's convention (`@/lib/utils`) remains the single source of truth.
export { cn } from "@/lib/utils";
