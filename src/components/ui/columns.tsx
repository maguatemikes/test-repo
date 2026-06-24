"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { X } from "lucide-react";

/**
 * Multi-column layout for the editor (2 or 3 side-by-side columns).
 *
 * In the editor these render via a React NodeView so each block gets a
 * page-builder-style hover × button (top-right) to remove the whole row.
 * Serialization still goes through renderHTML() below — emitting
 * `data-type="columns"` — so emailRender.ts can convert it to a side-by-side
 * <td> table, the only column layout Gmail/Outlook lay out reliably.
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      /** Insert a row of `count` (2–3) columns at the selection. */
      setColumns: (count?: number) => ReturnType;
    };
  }
}

/** A single column cell — holds any block content. */
export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,
  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "column", class: "nx-column" }), 0];
  },
});

/** Editor chrome: the columns row + a hover × button that removes the block. */
function ColumnsView({ deleteNode }: NodeViewProps) {
  return (
    <NodeViewWrapper className="nx-columns-wrap">
      <button
        type="button"
        className="nx-columns-del"
        contentEditable={false}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => deleteNode()}
        title="Remove columns"
      >
        <X size={13} />
      </button>
      <NodeViewContent className="nx-columns" />
    </NodeViewWrapper>
  );
}

/** The row wrapper that lays its columns out side by side. */
export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  isolating: true,
  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "columns", class: "nx-columns" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ColumnsView);
  },
  addCommands() {
    return {
      setColumns:
        (count = 2) =>
        ({ chain }) => {
          const n = Math.min(Math.max(Math.round(count), 2), 3);
          const columns = Array.from({ length: n }, () => ({
            type: "column",
            content: [{ type: "paragraph" }],
          }));
          return chain().insertContent({ type: "columns", content: columns }).focus().run();
        },
    };
  },
});
