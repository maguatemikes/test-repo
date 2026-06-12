"use client";

import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus, Type, type LucideIcon } from "lucide-react";

type Item = { title: string; icon: LucideIcon; command: (p: { editor: Editor; range: Range }) => void };

const ITEMS: Item[] = [
  { title: "Text", icon: Type, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run() },
  { title: "Heading 1", icon: Heading1, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run() },
  { title: "Heading 2", icon: Heading2, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run() },
  { title: "Heading 3", icon: Heading3, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run() },
  { title: "Bullet list", icon: List, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { title: "Numbered list", icon: ListOrdered, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { title: "Quote", icon: Quote, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
  { title: "Divider", icon: Minus, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
];

const font = "Helvetica Neue, Helvetica, Arial, sans-serif";

const SlashList = forwardRef(function SlashList(props: { items: Item[]; command: (item: Item) => void }, ref) {
  const [sel, setSel] = useState(0);
  useEffect(() => setSel(0), [props.items]);
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") { setSel((s) => (s + props.items.length - 1) % props.items.length); return true; }
      if (event.key === "ArrowDown") { setSel((s) => (s + 1) % props.items.length); return true; }
      if (event.key === "Enter") { if (props.items[sel]) props.command(props.items[sel]); return true; }
      return false;
    },
  }));
  if (!props.items.length) return null;
  return (
    <div className="rounded-lg" style={{ background: "#FFFFFF", border: "1px solid var(--border)", boxShadow: "0 8px 28px rgba(15,23,42,0.14)", width: 210, padding: 4, fontFamily: font }}>
      {props.items.map((it, i) => {
        const Icon = it.icon;
        return (
          <button key={it.title} onClick={() => props.command(it)} onMouseEnter={() => setSel(i)}
            className="flex items-center gap-2.5 w-full rounded text-left" style={{ padding: "7px 9px", fontSize: 13, color: "#0F172A", background: i === sel ? "#EFF6FF" : "transparent", cursor: "pointer" }}>
            <span className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 5, background: "#F1F5F9", color: "#475569" }}><Icon size={13} /></span>
            {it.title}
          </button>
        );
      })}
    </div>
  );
});

/* eslint-disable @typescript-eslint/no-explicit-any */
export const SlashCommands = Extension.create({
  name: "slashCommands",
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        command: ({ editor, range, props }: any) => props.command({ editor, range }),
        items: ({ query }: { query: string }) => ITEMS.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
        render: () => {
          let component: ReactRenderer;
          let popup: Instance[];
          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashList, { props, editor: props.editor });
              if (!props.clientRect) return;
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect, appendTo: () => document.body, content: component.element,
                showOnCreate: true, interactive: true, trigger: "manual", placement: "bottom-start",
              });
            },
            onUpdate: (props: any) => { component.updateProps(props); if (props.clientRect) popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect }); },
            onKeyDown: (props: any) => {
              if (props.event.key === "Escape") { popup?.[0]?.hide(); return true; }
              return (component.ref as any)?.onKeyDown(props) ?? false;
            },
            onExit: () => { popup?.[0]?.destroy(); component.destroy(); },
          };
        },
      }),
    ];
  },
});
