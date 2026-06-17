# Backend work — Org admin surface (Users & Roles, Org settings, Audit log)

Backend (crm-api / .NET) work required to make the new web UI in `SettingsView.tsx` functional end-to-end. The web layer is done: thin Next.js proxies forward the session cookie to crm-api and render whatever it returns. Everything below is crm-api + DB work.

## Status vs staging API (checked against `https://staging.netx.cc/api/openapi/v1.json`, v1)

The OpenAPI spec is authoritative (playground: "every endpoint is fully documented"). As of this check, `NETX_API_BASE_URL` resolves to `https://staging.netx.cc/api`.

| Endpoint the UI calls | Status |
|---|---|
| `POST /api/invites` (create invite) | ✅ exists ("admin only") — already wired |
| `GET` / `POST /api/invites/accept/{token}` | ✅ exists |
| `GET /api/me` (user + org + role) | ✅ exists |
| `PATCH /api/me` | ⚠️ exists but accepts only `name` + `email` (no `timeZone`) |
| `GET /api/me/org/members` | ❌ missing — build |
| `PATCH /api/me/org/members/{userId}` | ❌ missing — build |
| `DELETE /api/me/org/members/{userId}` | ❌ missing — build |
| `GET /api/invites` (list pending) | ❌ missing — build |
| `DELETE /api/invites/{id}` (revoke) | ❌ missing — build |
| `GET /api/org` + `PATCH /api/org` (incl. `timeZone`) | ❌ missing — build |
| `GET /api/audit-logs` | ❌ missing — build |

Notes:
- Since `POST /api/invites` + accept already work on staging, the **invites table exists server-side** (crm-api-owned, outside this repo's `migrations/`). `GET /api/invites` and `DELETE /api/invites/{id}` are additions on that existing table — not a new table.
- **Auth-level discrepancy to resolve:** the existing invite endpoint is documented "admin only," but this UI gates invites / member mutations on **super_admin**. Confirm which is authoritative before building the member-mutation endpoints.
- The broader Settings tabs (api-keys, webhooks, integrations, sending-domains) are also absent from the spec — out of scope here but they won't work until backed.
- Error envelope is uniform: `{ "code", "message" }`; list endpoints return `{ rows, total, page, pageSize }`. The web proxies already tolerate both this and bare arrays.

## Conventions the web layer assumes

- **Auth:** every request arrives with the user's session cookie. crm-api authenticates it and resolves the caller's `user_id` + `organization_id`.
- **Multi-tenant scoping:** every query is filtered by the caller's `organization_id` (per `SCHEMA_DESIGN.md` §1 — cross-tenant leakage is the top risk). Never trust an org id from the client.
- **Owner-only mutations = `super_admin`.** Member role changes, member removal, invites (create/revoke), and org updates must be rejected (403) unless the caller is `super_admin`. The UI also hides these controls, but the server is the source of truth.
- **Role enum** (from `crm_organization_members.role`): `super_admin, admin, marketing_manager, analyst, read_only`. Reject anything else with 400.
- **Response shapes:** the UI reads fields case-insensitively and accepts either a bare array or `{ rows: [...] }` for lists. Prefer canonical **camelCase** as shown below.

---

## 1. Members

### `GET /me/org/members`
List members of the caller's org. Join `crm_organization_members` → `crm_users`.

Response (array or `{ rows }`):
```json
[
  { "userId": 12, "email": "ryan@acme.io", "name": "Ryan Nguyen",
    "role": "super_admin", "joinedAt": "2026-01-04T10:00:00Z" }
]
```
- `name` from `crm_users.display_name` (fall back to email).
- Any authenticated member may read; non-owners just get no mutation controls.

### `PATCH /me/org/members/{userId}`  — change role
Body: `{ "role": "admin" }`. Returns `{ "ok": true }` (or the updated member).

Rules:
- `super_admin` only (403 otherwise).
- Validate role against the enum (400).
- **Last-owner guard:** refuse to demote the only remaining `super_admin` (409 / 422 with a clear message).
- **No self-demote:** reject if `userId` == caller (422). UI blocks this, enforce server-side too.
- Write an audit row (see §4).

### `DELETE /me/org/members/{userId}`  — remove member
Returns `{ "ok": true }`.

Rules:
- `super_admin` only.
- **Last-owner guard** and **no self-removal** (same as above).
- Hard-delete the `crm_organization_members` row (FK `ON DELETE CASCADE` already set). Decide whether to also delete/orphan the `crm_users` row if they belong to no other org — recommend leaving the user row intact.
- Audit row.
- _Note:_ "disable" (deactivate without removing) is intentionally not built — see Open decisions.

---

## 2. Invites

> **The invites table already exists server-side** (crm-api-owned — `POST /api/invites` and the accept flow work on staging; it's just not in this repo's `migrations/`). The two endpoints below are additions on that existing table, not new storage.

### `GET /invites` — list pending invites
Response (array or `{ rows }`):
```json
[
  { "id": 88, "email": "newhire@acme.io", "role": "analyst",
    "createdAt": "2026-06-15T09:00:00Z", "expiresAt": "2026-06-22T09:00:00Z" }
]
```
- Pending only (exclude accepted/expired/revoked).
- `super_admin` only is fine; the UI only shows this section to owners.

### `POST /invites` — create invite (already wired from the web)
Body: `{ "email", "role" }`. Response: `{ "inviteId": 88 }`.

Rules:
- `super_admin` only; validate role; validate email.
- Dedupe: 409 if the email is already a member or already has a pending invite.
- Generate a single-use token, set `expires_at = now + 7 days` (UI copy promises 7 days), send the invite email (template at `docs/invite-email-template.html`).

### `DELETE /invites/{id}` — revoke pending invite
Returns `{ "ok": true }`. `super_admin` only. Mark revoked (or delete). Audit row.

### Existing accept flow — keep as-is
`GET /invites/accept/{token}` → `{ org, role, hasAccount }`; `POST /invites/accept/{token}` `{ name, password }` → creates/links user, inserts membership row, issues session. (410 = expired, 400 = invalid/used.) Already consumed by `src/app/api/auth/invite/[token]`.

---

## 3. Organization settings

### `GET /org`
Must include the timezone field the UI now reads (`timeZone`, falls back to `timezone`):
```json
{ "name": "Acme", "billingEmail": "billing@acme.io", "slug": "acme",
  "status": "active", "planId": 3, "timeZone": "America/New_York" }
```

### `PATCH /org`
Body now includes timezone: `{ "name", "billingEmail", "timeZone" }`.
- `super_admin` only.
- Persist `timeZone` — **requires a storage decision** (see Open decisions); `crm_organizations` has no timezone column today.
- Audit row (`org.updated` with changed fields).

---

## 4. Audit log

### `GET /audit-logs`
Already wired through the settings proxy. Ensure it returns, newest first:
```json
[
  { "action": "member.role_changed", "detail": "analyst → admin",
    "actorEmail": "ryan@acme.io", "createdAt": "2026-06-17T12:00:00Z" }
]
```
UI reads `action`/`event`, `detail`/`description`, `actorEmail`/`user`/`actor`, `createdAt`/`time`. Map from `crm_audit_logs` (`action`, `metadata_json`, joined actor email, `occurred_at`).

### Write audit rows on every mutation
Each mutation above writes one `crm_audit_logs` row (org_id, user_id = actor, action, target_type, target_id, metadata_json, ip_address, occurred_at):

| Action | target_type | metadata_json |
|---|---|---|
| `member.role_changed` | `member` | `{ oldRole, newRole }` |
| `member.removed` | `member` | `{ email }` |
| `invite.created` | `invite` | `{ email, role }` |
| `invite.revoked` | `invite` | `{ email }` |
| `org.updated` | `organization` | `{ changed: ["name","timeZone"] }` |

This is what makes the Audit Log tab populate — without these writes it stays empty.

---

## 5. Database work

1. **`crm_invites` table** already exists server-side (drives the working `POST /api/invites` + accept). Confirm it carries `id`, `organization_id`, `email`, `role`, `token`, `invited_by`, `status` (`pending|accepted|revoked|expired`), `expires_at`, `created_at` and is indexed on `(organization_id, status)` so `GET /api/invites` and revoke are cheap. No new table needed.
2. **Org timezone storage** — pick one (Open decisions):
   - add `crm_organizations.time_zone VARCHAR(64) NOT NULL DEFAULT 'UTC'` (org-level), or
   - persist to the caller's `crm_users.time_zone` (per-user; no org column).
3. Any `ALTER`/new table on the shared `omnc` DB must be a versioned migration and is **flagged for approval first** (per `CLAUDE.md` → Database changes). Only `crm_*` tables.

---

## 6. Guardrails / edge cases checklist

- [ ] 403 on any owner-only endpoint when caller ≠ `super_admin`.
- [ ] Org scoping on every query (no cross-tenant reads/writes).
- [ ] Role validated against the 5-value enum.
- [ ] Cannot demote/remove the **last** `super_admin`.
- [ ] Cannot change own role or remove self.
- [ ] Invite dedupe (existing member or pending invite) → 409.
- [ ] Invite token single-use, 7-day expiry, 410 when expired.
- [ ] Audit row written for every mutation.
- [ ] Consistent error body so the proxy can surface a message (`{ message }` or `{ error }`, optional `code`).

---

## 7. Suggested order

1. `GET /me/org/members` (unblocks the roster — highest value).
2. `PATCH` + `DELETE /me/org/members/{userId}` with guardrails.
3. `GET /invites` + `DELETE /invites/{id}` on the existing invites table (POST already exists).
4. Org `timeZone` (decide storage) on `GET`/`PATCH /org`.
5. Audit writes on all of the above + verify `GET /audit-logs` shape.

---

## Open decisions (need a call)

- **Org timezone storage:** org-level column vs per-user. Web currently sends `timeZone` to `PATCH /org` (pass-through); backend decides where it lands.
- **Member "disable":** not implemented (no status column on `crm_organization_members`). If wanted, add `status ENUM('active','disabled')` + filter it out of access checks — that's a migration + auth-path change.
