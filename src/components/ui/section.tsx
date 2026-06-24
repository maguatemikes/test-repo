"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { X } from "lucide-react";

/**
 * Colored section / band. A block container with its own background + text
 * color so users can build hero strips, callouts, and footers. Renders the
 * color in the editor (so Write ≈ inbox) and serializes data-bg/data-color so
 * emailRender.ts can emit it as a full-width, email-safe colored band.
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    section: {
      /** Insert a colored section at the selection. */
      setSection: (bg?: string, color?: string) => ReturnType;
    };
  }
}

type Preset = { bg: string; color: string; label: string };
export const SECTION_PRESETS: Preset[] = [
  { bg: "#FFFFFF", color: "#1A2231", label: "White" },
  { bg: "#F4F4F5", color: "#1A2231", label: "Grey" },
  { bg: "#FFF7ED", color: "#7C2D12", label: "Cream" },
  { bg: "#EFF6FF", color: "#1E3A8A", label: "Sky" },
  { bg: "#1F2937", color: "#F3F4F6", label: "Slate" },
  { bg: "#0F172A", color: "#E2E8F0", label: "Ink" },
];

/** Pick readable text (dark/light) for an arbitrary background. */
function readable(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#1A2231";
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1A2231" : "#F3F4F6";
}

function SectionView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const bg = (node.attrs.bg as string) || "#F4F4F5";
  const color = (node.attrs.color as string) || "#1A2231";
  return (
    <NodeViewWrapper className="nx-section-wrap">
      <div className="nx-section-bar" contentEditable={false}>
        {SECTION_PRESETS.map((p) => (
          <button key={p.bg} type="button" title={p.label} onMouseDown={(e) => e.preventDefault()}
            onClick={() => updateAttributes({ bg: p.bg, color: p.color })}
            className="nx-section-swatch" style={{ background: p.bg, outline: bg.toUpperCase() === p.bg ? "2px solid #2563EB" : "1px solid rgba(15,23,42,0.15)" }} />
        ))}
        <label className="nx-section-swatch nx-section-custom" title="Custom color">
          <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(bg) ? bg : "#ffffff"} onChange={(e) => updateAttributes({ bg: e.target.value, color: readable(e.target.value) })} />
        </label>
        <button type="button" title="Remove section" onMouseDown={(e) => e.preventDefault()} onClick={() => deleteNode()} className="nx-section-del"><X size={12} /></button>
      </div>
      <NodeViewContent className="nx-section" style={{ background: bg, color }} />
    </NodeViewWrapper>
  );
}

export const Section = Node.create({
  name: "section",
  group: "block",
  content: "block+",
  isolating: true,

  addAttributes() {
    return {
      bg: { default: "#F4F4F5" },
      color: { default: "#1A2231" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="section"]',
        getAttrs: (el) => ({
          bg: (el as HTMLElement).getAttribute("data-bg") || "#F4F4F5",
          color: (el as HTMLElement).getAttribute("data-color") || "#1A2231",
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const bg = (node.attrs.bg as string) || "#F4F4F5";
    const color = (node.attrs.color as string) || "#1A2231";
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "section", "data-bg": bg, "data-color": color, class: "nx-section" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SectionView);
  },

  addCommands() {
    return {
      setSection:
        (bg = "#F4F4F5", color = "#1A2231") =>
        ({ chain }) =>
          chain().insertContent({ type: "section", attrs: { bg, color }, content: [{ type: "paragraph" }] }).focus().run(),
    };
  },
});
