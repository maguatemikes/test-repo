"use client";

import { useRef } from "react";
import { useEditor, EditorContent, BubbleMenu, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { ImageWithDelete } from "@/components/ui/imageNode";
import { SlashCommands } from "@/components/ui/slashCommands";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import AutoJoiner from "tiptap-extension-auto-joiner";
import { Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus, Link2, ImageIcon, Undo2, Redo2 } from "lucide-react";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

/** TipTap block editor — Beehiiv-style writing experience. Emits HTML + JSON. */
export function RichTextEditor({ value, onChange, placeholder = "Write your email…", bare = false }: {
  value?: string;
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
    content: value || "",
    onUpdate: ({ editor }) => onChange?.(editor.getHTML(), editor.getJSON()),
    editorProps: {
      attributes: { class: "nx-prose" },
      handleDrop(view, event) {
        const img = event.dataTransfer?.files && Array.from(event.dataTransfer.files).find((f) => f.type.startsWith("image/"));
        if (!img) return false;
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const node = view.state.schema.nodes.image.create({ src: reader.result });
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
          view.dispatch(view.state.tr.insert(pos, node));
        };
        reader.readAsDataURL(img);
        return true;
      },
      handlePaste(view, event) {
        const img = event.clipboardData?.files && Array.from(event.clipboardData.files).find((f) => f.type.startsWith("image/"));
        if (!img) return false;
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const node = view.state.schema.nodes.image.create({ src: reader.result });
          view.dispatch(view.state.tr.replaceSelectionWith(node));
        };
        reader.readAsDataURL(img);
        return true;
      },
    },
  });

  if (!editor) return <div style={{ height: 300, background: bare ? "transparent" : "#F8FAFC", borderRadius: 8 }} />;

  const outer = bare
    ? { background: "transparent", fontFamily: font }
    : { border: "1px solid var(--border)", background: "#FFFFFF", fontFamily: font, borderRadius: 8, overflow: "hidden" };

  return (
    <div style={outer}>
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
    if (file) { const reader = new FileReader(); reader.onload = () => editor.chain().focus().setImage({ src: reader.result as string }).run(); reader.readAsDataURL(file); }
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
      .nx-prose { min-height: ${minH}px; padding: ${pad}; outline: none; font-size: ${fs}px; line-height: ${lh}; color: #1A2231; font-family: ${font}; }
      .nx-prose:focus { outline: none; }
      .nx-prose p { margin: 0 0 ${bare ? 16 : 10}px; }
      .nx-prose h1 { font-size: ${bare ? 34 : 26}px; font-weight: 700; margin: ${bare ? 28 : 18}px 0 ${bare ? 12 : 8}px; line-height: 1.2; letter-spacing: -0.01em; }
      .nx-prose h2 { font-size: ${bare ? 25 : 20}px; font-weight: 700; margin: ${bare ? 24 : 16}px 0 ${bare ? 10 : 6}px; line-height: 1.3; letter-spacing: -0.01em; }
      .nx-prose h3 { font-size: ${bare ? 19 : 16}px; font-weight: 600; margin: ${bare ? 18 : 14}px 0 6px; }
      .nx-prose ul, .nx-prose ol { padding-left: 22px; margin: 0 0 10px; }
      .nx-prose ul { list-style: disc; } .nx-prose ol { list-style: decimal; }
      .nx-prose li { margin: 2px 0; }
      .nx-prose blockquote { border-left: 3px solid #CBD5E1; padding-left: 12px; margin: 12px 0; color: #475569; font-style: italic; }
      .nx-prose a { color: #2563EB; text-decoration: underline; }
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
