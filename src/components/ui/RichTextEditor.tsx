"use client";

import { useRef } from "react";
import { useEditor, EditorContent, BubbleMenu, type Editor } from "@tiptap/react";
import type { Content } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { ImageWithDelete } from "@/components/ui/imageNode";
import { SlashCommands } from "@/components/ui/slashCommands";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import AutoJoiner from "tiptap-extension-auto-joiner";
import { Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus, Link2, ImageIcon, Undo2, Redo2 } from "lucide-react";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

// ---- Image uploads (→ /api/uploads proxy → crm-api → cdn.netx.cc) ----
// We no longer embed base64 (Gmail strips it). Files upload to the CDN and the
// editor stores the returned hosted URL, so "what you see = what sends".
const UPLOAD_ERRORS: Record<string, string> = {
  unauthorized: "Your session expired — please sign in again, then retry.",
  file_too_large: "That image is over the 5MB limit.",
  unsupported_type: "Unsupported file type. Use JPEG, PNG, WebP, or GIF.",
  invalid_image: "That file isn't a valid image.",
  rate_limited: "Too many uploads — wait a moment and try again.",
};

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "include" });
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    // crm-api error envelope: { code, message }
    const err = data as { code?: string; message?: string };
    throw new Error(UPLOAD_ERRORS[err?.code ?? ""] || err?.message || "Image upload failed. Please try again.");
  }
  const d = data as Record<string, unknown>;
  const url = (d.url ?? d.Url ?? d.cdnUrl ?? d.location) as string | undefined;
  if (!url) throw new Error("Upload succeeded but no URL was returned.");
  return url;
}

function findImagePos(view: EditorView, src: string): number | null {
  let pos: number | null = null;
  view.state.doc.descendants((node, p) => {
    if (pos === null && node.type.name === "image" && node.attrs.src === src) pos = p;
  });
  return pos;
}

/** Insert a local preview immediately, upload, then swap to the hosted URL. */
function placeAndUpload(view: EditorView, file: File, pos?: number) {
  if (!file.type.startsWith("image/")) return;
  const tempSrc = URL.createObjectURL(file);
  const at = pos ?? view.state.selection.from;
  view.dispatch(view.state.tr.insert(at, view.state.schema.nodes.image.create({ src: tempSrc })));
  uploadImage(file)
    .then((url) => {
      const p = findImagePos(view, tempSrc);
      if (p === null) return;
      const node = view.state.doc.nodeAt(p);
      if (node) view.dispatch(view.state.tr.setNodeMarkup(p, undefined, { ...node.attrs, src: url }));
    })
    .catch((e: unknown) => {
      const p = findImagePos(view, tempSrc);
      if (p !== null) {
        const node = view.state.doc.nodeAt(p);
        if (node) view.dispatch(view.state.tr.delete(p, p + node.nodeSize));
      }
      window.alert((e as Error).message);
    })
    .finally(() => URL.revokeObjectURL(tempSrc));
}

/** TipTap block editor — Beehiiv-style writing experience. Emits HTML + JSON. */
export function RichTextEditor({ value, doc, accent, onChange, placeholder = "Write your email…", bare = false }: {
  value?: string;
  /** TipTap JSON to load instead of `value` (preferred — avoids re-parsing
   *  the email HTML we store in htmlBody). Falls back to `value`. */
  doc?: unknown;
  /** Accent color for links / blockquote, so the canvas matches the email. */
  accent?: string;
  onChange?: (html: string, json: unknown) => void;
  placeholder?: string;
  /** Borderless, blends into a full-page canvas (Beehiiv style). */
  bare?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false, // avoid Next.js SSR hydration mismatch
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      ImageWithDelete,
      Placeholder.configure({ placeholder }),
      SlashCommands,
      GlobalDragHandle.configure({ dragHandleWidth: 24, scrollTreshold: 100 }),
      AutoJoiner,
    ],
    content: ((doc as Content) ?? value ?? "") as Content,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML(), editor.getJSON()),
    editorProps: {
      attributes: { class: "nx-prose" },
      handleDrop(view, event) {
        const img = event.dataTransfer?.files && Array.from(event.dataTransfer.files).find((f) => f.type.startsWith("image/"));
        if (!img) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
        placeAndUpload(view, img, pos);
        return true;
      },
      handlePaste(view, event) {
        const img = event.clipboardData?.files && Array.from(event.clipboardData.files).find((f) => f.type.startsWith("image/"));
        if (!img) return false;
        event.preventDefault();
        placeAndUpload(view, img);
        return true;
      },
    },
  });

  // Emit the initial HTML+JSON once the editor exists AND its content has been
  // applied. onCreate fires too early (immediatelyRender:false + content prop),
  // returning empty HTML, which would persist an empty htmlBody. A deferred
  // tick guarantees the loaded doc/value is in place before we read it.
  if (!editor) return <div style={{ height: 300, background: bare ? "transparent" : "#F8FAFC", borderRadius: 8 }} />;

  const outer = bare
    ? { background: "transparent", fontFamily: "inherit" }
    : { border: "1px solid var(--border)", background: "#FFFFFF", fontFamily: font, borderRadius: 8, overflow: "hidden" };

  return (
    <div style={{ ...outer, ...(accent ? { ["--nx-accent"]: accent } : {}) } as React.CSSProperties}>
      <Toolbar editor={editor} bare={bare} />
      <BubbleMenu editor={editor} tippyOptions={{ duration: 120 }}>
        <div className="flex items-center gap-0.5 rounded-lg px-1 py-0.5" style={{ background: "#0F172A", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
          <BubbleBtn active={editor.isActive("bold")} on={() => editor.chain().focus().toggleBold().run()}><Bold size={13} /></BubbleBtn>
          <BubbleBtn active={editor.isActive("italic")} on={() => editor.chain().focus().toggleItalic().run()}><Italic size={13} /></BubbleBtn>
          <BubbleBtn active={editor.isActive("strike")} on={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={13} /></BubbleBtn>
          <BubbleBtn active={editor.isActive("heading", { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={14} /></BubbleBtn>
          <BubbleBtn active={editor.isActive("link")} on={() => { const u = window.prompt("Link URL", "https://"); if (u) editor.chain().focus().extendMarkRange("link").setLink({ href: u }).run(); }}><Link2 size={13} /></BubbleBtn>
        </div>
      </BubbleMenu>
      <div style={bare ? {} : { maxHeight: 420, overflowY: "auto" }}>
        <EditorContent editor={editor} />
      </div>
      <ProseStyles bare={bare} />
    </div>
  );
}

function BubbleBtn({ on, active, children }: { on: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={on} className="flex items-center justify-center rounded"
      style={{ width: 26, height: 26, color: active ? "#60A5FA" : "#E2E8F0", background: active ? "rgba(96,165,250,0.15)" : "transparent", cursor: "pointer" }}>
      {children}
    </button>
  );
}

function Btn({ on, active, disabled, title, children }: { on: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={on} disabled={disabled}
      className="flex items-center justify-center rounded"
      style={{ width: 28, height: 28, color: active ? "#2563EB" : "#64748B", background: active ? "#EFF6FF" : "transparent", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  );
}

function Toolbar({ editor, bare = false }: { editor: Editor; bare?: boolean }) {
  const sep = <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 3px" }} />;
  const addLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { editor.commands.focus(); placeAndUpload(editor.view, file); }
    e.target.value = "";
  };
  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5" style={{ border: "1px solid var(--border)", background: "#FFFFFF", position: "sticky", top: 0, zIndex: 2, borderRadius: bare ? 10 : 0, borderLeftWidth: bare ? 1 : 0, borderRightWidth: bare ? 1 : 0, borderTopWidth: bare ? 1 : 0, marginBottom: bare ? 4 : 0, boxShadow: bare ? "0 1px 4px rgba(15,23,42,0.06)" : "none" }}>
      <Btn title="Bold" active={editor.isActive("bold")} on={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></Btn>
      <Btn title="Italic" active={editor.isActive("italic")} on={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></Btn>
      <Btn title="Strikethrough" active={editor.isActive("strike")} on={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={14} /></Btn>
      {sep}
      <Btn title="Heading 1" active={editor.isActive("heading", { level: 1 })} on={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={15} /></Btn>
      <Btn title="Heading 2" active={editor.isActive("heading", { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></Btn>
      <Btn title="Heading 3" active={editor.isActive("heading", { level: 3 })} on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></Btn>
      {sep}
      <Btn title="Bullet list" active={editor.isActive("bulletList")} on={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></Btn>
      <Btn title="Numbered list" active={editor.isActive("orderedList")} on={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></Btn>
      <Btn title="Quote" active={editor.isActive("blockquote")} on={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={14} /></Btn>
      <Btn title="Divider" on={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></Btn>
      {sep}
      <Btn title="Link" active={editor.isActive("link")} on={addLink}><Link2 size={14} /></Btn>
      <Btn title="Upload image" on={() => fileRef.current?.click()}><ImageIcon size={14} /></Btn>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
      <div className="flex-1" />
      <Btn title="Undo" disabled={!editor.can().undo()} on={() => editor.chain().focus().undo().run()}><Undo2 size={14} /></Btn>
      <Btn title="Redo" disabled={!editor.can().redo()} on={() => editor.chain().focus().redo().run()}><Redo2 size={14} /></Btn>
    </div>
  );
}

function ProseStyles({ bare = false }: { bare?: boolean }) {
  const fs = bare ? 16.5 : 14;
  const lh = bare ? 1.75 : 1.6;
  const pad = bare ? "12px 2px 240px" : "16px 18px";
  const minH = bare ? 360 : 260;
  return (
    <style>{`
      .nx-prose { min-height: ${minH}px; padding: ${pad}; outline: none; font-size: ${fs}px; line-height: ${lh}; color: ${bare ? "inherit" : "#1A2231"}; font-family: ${bare ? "inherit" : font}; }
      .nx-prose:focus { outline: none; }
      .nx-prose p { margin: 0 0 ${bare ? 16 : 10}px; }
      .nx-prose h1 { font-size: ${bare ? 34 : 26}px; font-weight: 700; margin: ${bare ? 28 : 18}px 0 ${bare ? 12 : 8}px; line-height: 1.2; letter-spacing: -0.01em; }
      .nx-prose h2 { font-size: ${bare ? 25 : 20}px; font-weight: 700; margin: ${bare ? 24 : 16}px 0 ${bare ? 10 : 6}px; line-height: 1.3; letter-spacing: -0.01em; }
      .nx-prose h3 { font-size: ${bare ? 19 : 16}px; font-weight: 600; margin: ${bare ? 18 : 14}px 0 6px; }
      .nx-prose ul, .nx-prose ol { padding-left: 22px; margin: 0 0 10px; }
      .nx-prose ul { list-style: disc; } .nx-prose ol { list-style: decimal; }
      .nx-prose li { margin: 2px 0; }
      .nx-prose blockquote { border-left: 3px solid ${bare ? "var(--nx-accent, #CBD5E1)" : "#CBD5E1"}; padding-left: 12px; margin: 12px 0; color: #475569; font-style: italic; }
      .nx-prose a { color: var(--nx-accent, #2563EB); text-decoration: underline; }
      .nx-prose img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
      .nx-prose hr { border: none; border-top: 1px solid #E2E8F0; margin: 16px 0; }
      .nx-prose code { background: #F1F5F9; padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 12px; }
      .nx-prose p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #94A3B8; float: left; height: 0; pointer-events: none; }
      .drag-handle { position: fixed; opacity: 1; transition: opacity 0.2s ease; border-radius: 5px; width: 22px; height: 22px; z-index: 40; cursor: grab; background-repeat: no-repeat; background-position: center; background-size: 13px; background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="16" viewBox="0 0 10 16" fill="%2394A3B8"><circle cx="2.5" cy="3" r="1.3"/><circle cx="7.5" cy="3" r="1.3"/><circle cx="2.5" cy="8" r="1.3"/><circle cx="7.5" cy="8" r="1.3"/><circle cx="2.5" cy="13" r="1.3"/><circle cx="7.5" cy="13" r="1.3"/></svg>'); }
      .drag-handle:hover { background-color: #F1F5F9; }
      .drag-handle:active { cursor: grabbing; }
      .drag-handle.hide { opacity: 0; pointer-events: none; }
      .nx-img-wrap { position: relative; display: block; margin: 10px 0; width: fit-content; max-width: 100%; }
      .nx-img { max-width: 100%; border-radius: 8px; display: block; }
      .nx-img-wrap[data-selected="true"] .nx-img { outline: 2px solid #2563EB; outline-offset: 2px; }
      .nx-img-del { position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; border-radius: 999px; background: rgba(15,23,42,0.65); color: #fff; border: none; display: none; align-items: center; justify-content: center; cursor: pointer; }
      .nx-img-wrap:hover .nx-img-del { display: flex; }
    `}</style>
  );
}
