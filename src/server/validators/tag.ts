/**
 * Lightweight input validation for tags (no external deps).
 * Swap for Zod later if desired.
 */
export type TagInput = { name: string; color?: string };

export function validateTagInput(input: { name?: unknown; color?: unknown }): TagInput {
  const name = typeof input.name === "string" ? input.name.trim().toLowerCase() : "";
  if (!name) throw new Error("Tag name is required");
  if (name.length > 64) throw new Error("Tag name must be 64 characters or fewer");
  const color = typeof input.color === "string" && input.color.trim() ? input.color.trim() : undefined;
  return { name, color };
}
