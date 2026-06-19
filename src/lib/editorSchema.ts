/**
 * Deterministically turn a TipTap doc (JSON) into semantic HTML, without a live
 * editor instance. We render email HTML from the doc rather than the editor's
 * getHTML() because the latter races with content application (onCreate/effects
 * fire before `content` is applied), which left htmlBody empty/stale.
 */
import { generateHTML, generateJSON, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { ImageWithDelete } from "@/components/ui/imageNode";

// Schema-defining extensions only (the nodes/marks a doc can contain). Behavior
// plugins (drag handle, slash menu, auto-joiner) add no schema, so they're omitted.
export const CONTENT_EXTENSIONS = [StarterKit, Link, ImageWithDelete];

export function docToHtml(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  try {
    return generateHTML(doc as JSONContent, CONTENT_EXTENSIONS);
  } catch {
    return "";
  }
}

/** Inverse of docToHtml — parse semantic HTML into a TipTap doc, so a seeded
 *  (unedited) template still persists a doc and survives reopen. */
export function htmlToDoc(html: string): JSONContent | null {
  if (!html) return null;
  try {
    return generateJSON(html, CONTENT_EXTENSIONS);
  } catch {
    return null;
  }
}
