"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus, Link2, ImageIcon, Undo2, Redo2 } from "lucide-react";

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

/** TipTap block editor — Beehiiv-style writing experience. Emits HTML + JSON. */
export function RichTextEditor({ value, onChange, placeholder = "Write your email…" }: {
  value?: string;
  onChange?: (html: string, json: unknown) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false, // avoid Next.js SSR hydration mismatch
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange?.(editor.getHTML(), editor.getJSON()),
    editorProps: { attributes: { class: "nx-prose" } },
  });

  if (!editor) return <div style={{ height: 300, background: "#F8FAFC", borderRadius: 8 }} />;

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)", background: "#FFFFFF", fontFamily: font }}>
      <Toolbar editor={editor} />
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        <EditorContent editor={editor} />
      </div>
      <ProseStyles />
    </div>
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

function Toolbar({ editor }: { editor: Editor }) {
  const sep = <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 3px" }} />;
  const addLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  const addImage = () => {
    const url = window.prompt("Image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };
  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5" style={{ borderBottom: "1px solid var(--border)", background: "#F8FAFC", position: "sticky", top: 0, zIndex: 2 }}>
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
      <Btn title="Image" on={addImage}><ImageIcon size={14} /></Btn>
      <div className="flex-1" />
      <Btn title="Undo" disabled={!editor.can().undo()} on={() => editor.chain().focus().undo().run()}><Undo2 size={14} /></Btn>
      <Btn title="Redo" disabled={!editor.can().redo()} on={() => editor.chain().focus().redo().run()}><Redo2 size={14} /></Btn>
    </div>
  );
}

function ProseStyles() {
  return (
    <style>{`
      .nx-prose { min-height: 260px; padding: 16px 18px; outline: none; font-size: 14px; line-height: 1.6; color: #0F172A; font-family: ${font}; }
      .nx-prose:focus { outline: none; }
      .nx-prose p { margin: 0 0 10px; }
      .nx-prose h1 { font-size: 26px; font-weight: 700; margin: 18px 0 8px; line-height: 1.25; }
      .nx-prose h2 { font-size: 20px; font-weight: 700; margin: 16px 0 6px; line-height: 1.3; }
      .nx-prose h3 { font-size: 16px; font-weight: 600; margin: 14px 0 6px; }
      .nx-prose ul, .nx-prose ol { padding-left: 22px; margin: 0 0 10px; }
      .nx-prose ul { list-style: disc; } .nx-prose ol { list-style: decimal; }
      .nx-prose li { margin: 2px 0; }
      .nx-prose blockquote { border-left: 3px solid #CBD5E1; padding-left: 12px; margin: 12px 0; color: #475569; font-style: italic; }
      .nx-prose a { color: #2563EB; text-decoration: underline; }
      .nx-prose img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
      .nx-prose hr { border: none; border-top: 1px solid #E2E8F0; margin: 16px 0; }
      .nx-prose code { background: #F1F5F9; padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 12px; }
      .nx-prose p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #94A3B8; float: left; height: 0; pointer-events: none; }
    `}</style>
  );
}
