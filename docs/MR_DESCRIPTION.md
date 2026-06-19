## 🚀 Marketing surface — content editor, automations, forms, campaigns & segments

> Brings the marketing surface live end-to-end on crm-web — template editor, automations builder, forms, campaign send UX, segment sends, and the org switcher. All wired to crm-api with **no mocked data** on these screens.

---

### ✨ What's in this MR

**📝 Content / template editor**
- TipTap block editor — slash commands, drag-to-reorder, autosave, email-size gauge
- Preview-tile template cards with a kebab menu, plus quick-start templates
- Email-safe rendering so the inbox matches the editor
- 🖼️ Editor images now upload to **`cdn.netx.cc`** (new `/api/uploads` proxy) instead of base64 — Gmail-safe

**⚡ Automations**
- n8n-style React Flow builder on `/api/automations` — draggable/connectable nodes, settings modal, deletable edges, type badges
- **Execute workflow** — live test run: real email to the test inbox, moving-light animation + run log, real-time delay units (seconds → days)

**📋 Forms**
- New **Waitlist pill** form type alongside Standard, chosen via a picker
- Inline embed snippet posts to the public submit endpoint
- Fix: campaign/form slug no longer wiped on re-save

**📣 Campaigns**
- Styled send/delete confirmation (replaces native browser dialogs)
- Status auto-updates **Sending → Sent** with a spinner — no manual refresh
- Default sender set to the verified `no-reply@crm.netx.cc`

**🎯 Segments**
- Reads the materialized `memberCount` directly (drops the old live-preview workaround)
- Live-count fallback for brand-new segments; adds the missing `DELETE` proxy

**🏢 Shell**
- Org switcher wired to `/api/me` — shows the real `org.name` (no more hardcoded "Acme Corp")

---

### ✅ Verification

- [x] `tsc --noEmit` — clean
- [x] `next lint` — clean (warnings only)
- [x] `scripts/qa-smoke.mjs` — 24 / 24 endpoint contract checks
- [x] Live on staging: CDN image upload, campaign send (Sending → Sent), automation execute, segment send (Form Lead = 12 recipients), org switcher shows the real org

---

### 📦 Dependencies & notes

- **New dependency:** `@xyflow/react` (React Flow)
- Segment materialization is live on crm-api → segment-targeted sends now deliver
- Image upload API is live; migrating *existing* base64 template images to the CDN is a follow-up
- Automation **runtime** ships Sprint 3 — "Execute workflow" is an interim test harness (sends via a throwaway campaign); clean test-run endpoint is specced in `docs/`
- Open/click tracking is **not** yet supported on the backend (proposal in `docs/`)
- `SessionProvider` touched **additively** (optional `org` field only — no auth behavior change); the `TopBar.tsx` slug was left to its owner

---

### 🔍 How to test

1. **Content** → open a template → drag in an image → confirm the src becomes a `cdn.netx.cc` URL
2. **Automations** → open a flow → set a delay to seconds → **Execute workflow** → watch the light move and receive the email
3. **Campaigns** → send to a list or segment → status flips Sending → Sent on its own
4. **Forms** → New Form → pick **Waitlist** → copy the embed snippet

---

<details>
<summary>📂 Commits in this set</summary>

```
feat(forms): add Waitlist pill form type + Standard/Waitlist picker
feat(content): upload editor images to CDN instead of base64
feat(automations): n8n-style builder + Execute-workflow test run
feat(campaigns): styled send/delete confirm + auto-poll sending->sent
feat(segments): use materialized memberCount + add DELETE proxy
feat(shell): wire org switcher to /api/me org.name
docs: backend proposals + QA smoke script
```

(plus the earlier content-editor commit series already on `staging`)

</details>
