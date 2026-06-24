"use client";

import { Node, mergeAttributes, InputRule } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

/**
 * Personalization / merge tags — e.g. {{first_name}}.
 *
 * In the editor a tag renders as a pill (showing a friendly label) so it reads
 * naturally and can't be half-deleted. It serializes to the literal token text
 * `{{first_name}}` (optionally `{{first_name|fallback}}`) inside the HTML, which
 * crm-api swaps per-recipient at send time. Typing `{{name}}` auto-converts to
 * a pill via an input rule.
 */

export type MergeField = { field: string; label: string };

/** The tokens we offer. Mapped to crm-api contact fields at send time. */
export const MERGE_FIELDS: MergeField[] = [
  { field: "first_name", label: "First name" },
  { field: "last_name", label: "Last name" },
  { field: "name", label: "Full name" },
  { field: "email", label: "Email" },
  { field: "company", label: "Company" },
];

const FIELD_LABELS: Record<string, string> = Object.fromEntries(MERGE_FIELDS.map((f) => [f.field, f.label]));
const labelFor = (field: string) => FIELD_LABELS[field] || field.replace(/_/g, " ");

/** The literal token text stored in the HTML (what crm-api replaces). */
function token(field: string, fallback?: string | null): string {
  return fallback ? `{{${field}|${fallback}}}` : `{{${field}}}`;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mergeTag: {
      /** Insert a personalization token (e.g. "first_name"). */
      insertMergeTag: (field: string, fallback?: string | null) => ReturnType;
    };
  }
}

function MergeTagView({ node }: NodeViewProps) {
  const field = node.attrs.field as string;
  const fallback = node.attrs.fallback as string | null;
  return (
    <NodeViewWrapper as="span" className="nx-merge" data-field={field} contentEditable={false} title={token(field, fallback)}>
      {/* Inner element (not a bare text node) so BubbleMenu's nodeViewWrapper.firstChild.getBoundingClientRect() doesn't crash on selection. */}
      <span>{labelFor(field)}</span>
    </NodeViewWrapper>
  );
}

export const MergeTag = Node.create({
  name: "mergeTag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      field: { default: "first_name" },
      fallback: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-merge]",
        getAttrs: (el) => ({
          field: (el as HTMLElement).getAttribute("data-merge") || "first_name",
          fallback: (el as HTMLElement).getAttribute("data-fallback") || null,
        }),
      },
    ];
  },

  // Serialize to the literal token text so crm-api can find + replace it.
  renderHTML({ node }) {
    const field = node.attrs.field as string;
    const fallback = node.attrs.fallback as string | null;
    const attrs: Record<string, string> = { "data-merge": field };
    if (fallback) attrs["data-fallback"] = fallback;
    return ["span", mergeAttributes(attrs), token(field, fallback)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MergeTagView);
  },

  addCommands() {
    return {
      insertMergeTag:
        (field, fallback = null) =>
        ({ chain }) =>
          chain().insertContent({ type: "mergeTag", attrs: { field, fallback } }).run(),
    };
  },

  // Typing `{{first_name}}` (or `{{first_name|there}}`) becomes a pill.
  addInputRules() {
    return [
      new InputRule({
        find: /\{\{\s*([\w.]+)\s*(?:\|\s*([^{}|]+?)\s*)?\}\}$/,
        handler: ({ range, match, chain }) => {
          const field = (match[1] || "").toLowerCase();
          const fallback = match[2] ? match[2].trim() : null;
          if (!field) return;
          chain().insertContentAt(range, { type: "mergeTag", attrs: { field, fallback } }).run();
        },
      }),
    ];
  },
});
