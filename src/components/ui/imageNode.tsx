"use client";

import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { X } from "lucide-react";

/** Image with a hover delete (×) button. */
function ImageView({ node, deleteNode, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper className="nx-img-wrap" data-selected={selected ? "true" : "false"}>
      <img src={node.attrs.src as string} alt={(node.attrs.alt as string) || ""} className="nx-img" draggable={false} />
      <button type="button" className="nx-img-del" onMouseDown={(e) => e.preventDefault()} onClick={() => deleteNode()} title="Remove image">
        <X size={14} />
      </button>
    </NodeViewWrapper>
  );
}

export const ImageWithDelete = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
}).configure({ inline: false, allowBase64: true });
