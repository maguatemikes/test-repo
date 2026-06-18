# Proposal: Resolve Segment Membership on Campaign Send (crm-api)

**Status:** Draft for crm-api review — **bug fix, high priority**
**Scope:** Backend / API layer. Frontend already works around the display side; the send side cannot be fixed from the frontend.

---

## 1. Problem

Sending a campaign to a **segment** delivers to **nobody** — `recipientCount` comes back `0` even when the segment clearly has members.

Confirmed on staging:
- Segment **"Form Lead"** (id 10) — live rule evaluation returns 10+ contacts including `maguatemikes@gmail.com` and `virtualdev09@gmail.com`.
- Campaigns **#41** and **#43** targeted segment 10 → both `status: sent`, **`recipientCount: 0`, `deliveredCount: 0`**. They sent to no one.

Root cause: **crm-api does not materialize segment membership.**
- `GET /api/segments/{id}/members` returns 0 (unmaterialized).
- `memberCount` is always `0` / `lastRefreshedAt` is null.
- The campaign send path resolves recipients from this **empty materialized membership**, so a segment send finds 0 recipients.

Lists are unaffected because list membership is explicitly stored. Segments are rule-based and never get evaluated into actual members for sending.

The frontend masks the *display* symptom by computing counts live via `POST /api/segments/preview`, but it **cannot** fix the send: the bulk-send API takes a `targetSegmentId` and resolves server-side — there is no way to pass an explicit recipient list to a bulk send.

## 2. Goal

When a campaign targets a segment, the send must resolve the segment's rule into the actual set of contacts and enqueue them — exactly as it already does for lists.

## 3. Fix (either approach)

**Recommended: materialize segment membership into a stored member set, refreshed on a schedule AND re-evaluated immediately before each send.**

Concretely:
1. Add a `crm_segment_members` table (`segment_id`, `contact_id`, indexed). A "materialize" routine evaluates a segment's `ruleDefinition` (the same query `POST /segments/preview` already runs) and writes the matching contacts into it, stamping `lastRefreshedAt`.
2. Run materialization (a) on a background schedule so counts/members stay reasonably fresh, and (b) **synchronously at the start of the campaign send** for the targeted segment, so a send is never stale (a brand-new form lead enrolled seconds ago is still included).
3. The send pipeline reads recipients from `crm_segment_members` — exactly like it already reads list membership.

### Why this over "just resolve the rule at send time"
Resolving the rule live at send time (and storing nothing) is the smaller change, but it's a partial fix and not recommended on its own:
- It leaves `memberCount` and `GET /segments/{id}/members` still broken (always 0), so the **frontend has to keep its live-preview workaround forever** — two code paths evaluating the same rule, which will drift.
- It runs the full rule query **synchronously inside the send path**; for a large segment that's a slow, blocking query (and a timeout/failure risk) on every send.
- A stored, indexed member set makes sends fast and is the standard approach mature ESPs use.

Materializing + refreshing-at-send gives correctness, freshness, AND fixes the count/members endpoints in one change — so it's the better investment even though it's slightly more work than the send-time-only shortcut.

## 4. Also fixed by this approach
- `GET /api/segments/{id}/members` returns real, stored members.
- `memberCount` / `lastRefreshedAt` become accurate → the frontend can **drop** its live-preview count workaround in `src/app/api/segments/route.ts` (one source of truth).
- Segment member export / preview-of-record all read the same materialized set.

## 5. Acceptance criteria
- A campaign targeting segment "Form Lead" (id 10) reports a non-zero `recipientCount` matching the segment's evaluated membership, and the members actually receive the email.
- `recipientCount` for a segment send equals the count shown in the UI (live preview) for the same rule.
- Lists continue to behave as today.
- Exclusion segment (`excludeSegmentId`), if set, is resolved the same way and subtracted.

## 6. Note on exclusions & dedup
The send should also resolve `excludeSegmentId` (if present) via the same mechanism and remove those contacts, and de-duplicate against the primary list/segment so a contact in both isn't emailed twice.

## 7. Downstream (frontend) impact — for awareness
No frontend change is required to fix the send. Once materialized membership lands, the frontend can drop the live-preview count workaround in `src/app/api/segments/route.ts` and read `memberCount`/`/members` directly. Until this ships, **segment sends should be considered non-functional** — only list sends deliver.
