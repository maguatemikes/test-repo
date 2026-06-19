# Proposal: Email Open & Click Tracking (crm-api)

**Status:** Draft for crm-api review
**Scope:** Backend / API layer only. Frontend consumption (campaign analytics, dashboard, per-customer engagement) is downstream and not covered here.

---

## 1. Problem

Campaign records already expose `openedCount`, `clickedCount`, `bouncedCount`, `complainedCount`, and `unsubscribedCount`, and `GET /api/campaigns/{id}/analytics` is published — but **nothing populates the open/click figures**. There is no ingestion mechanism: no tracking pixel, no click-redirect, and no inbound delivery-event receiver. As a result every open/click metric is `0`, and the UI currently has to show placeholder values for:

- Campaign analytics (open rate, click rate, CTR)
- The dashboard engagement chart and KPIs
- The per-customer **Engagement** panel (Open Rate, Click Rate, Last Opened)

Unsubscribe is the only engagement signal currently supported (`UpdatePreferencesRequest.unsubscribe`).

This proposal defines the minimum API surface and data model to make open and click metrics real, plus an optional path for delivery/bounce/complaint via the ESP.

## 2. Goals

1. Record **opens** and **clicks** per campaign and per recipient.
2. Distinguish **unique** vs **total** events.
3. Populate the existing campaign counters and analytics endpoint with real data.
4. Expose **per-recipient engagement** so the customer drawer can show real figures.
5. Be forgery-resistant (no enumerable IDs in tracking URLs) and privacy-aware.

Non-goals: heatmaps, link-level UI analytics dashboards, A/B testing (future).

## 3. Design overview

Tracking is injected at **send time** and ingested via two lightweight public endpoints.

### 3.1 Open tracking — pixel

Inject a 1×1 transparent GIF at the end of each email body at send time:

```
<img src="https://staging.netx.cc/api/track/o/{token}" width="1" height="1" alt="" style="display:none">
```

- **`GET /api/track/o/{token}`** → records an open event, returns a 1×1 GIF (`Content-Type: image/gif`, `Cache-Control: no-store`), always `200` (never reveal validity).
- `{token}` is an **opaque, HMAC-signed** value encoding `{campaignId, recipientId}` (see §3.4). No raw IDs in the URL.

### 3.2 Click tracking — link rewrite

At send time, rewrite every `<a href>` in the email to a redirect URL:

```
https://staging.netx.cc/api/track/c/{token}
```

- **`GET /api/track/c/{token}`** → records a click event, then **302 redirect** to the original destination.
- `{token}` encodes `{campaignId, recipientId, linkId}`; the original URL is resolved server-side from `linkId` (preferred — keeps URLs short and tamper-proof) **or** carried as a signed `u` param. Server-side resolution is recommended.
- Unsubscribe / preference links are **excluded** from rewriting.

### 3.3 Data model (proposed `crm_*` tables)

```
crm_email_links
  id              PK
  campaign_id     FK
  url             text
  created_at

crm_email_events
  id              PK
  campaign_id     FK
  recipient_id    FK (customer/subscriber)
  type            enum('open','click','bounce','complaint','delivery')
  link_id         FK nullable (clicks)
  occurred_at     timestamp
  ip              inet nullable
  user_agent      text nullable
  is_machine      bool default false   -- proxy/prefetch flagging (see §5)
```

Aggregate counters (`openedCount` = unique opens, etc.) can be denormalised onto the campaign row via triggers or a rollup job, with raw events retained for per-recipient queries and reprocessing.

### 3.4 Token format

- Opaque token = `base64url(payload) + "." + base64url(HMAC_SHA256(payload, SERVER_SECRET))`, payload = compact binary/JSON of the IDs.
- Reject on bad signature (still return the GIF / a neutral redirect to avoid leaking validity).
- Prevents enumeration and event forgery; contains no PII.

## 4. Proposed API surface

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/track/o/{token}` | Open pixel — record + return 1×1 GIF | Public (token) |
| `GET` | `/api/track/c/{token}` | Click — record + 302 redirect | Public (token) |
| `GET` | `/api/customers/{id}/engagement` | Per-recipient engagement summary | Session |
| `POST` | `/api/track/esp` *(optional, §6)* | ESP delivery/bounce/complaint webhook | Signed |

`GET /api/campaigns/{id}/analytics` keeps its contract; it simply starts returning real numbers. Suggested fields to guarantee in the analytics response:

```json
{
  "sent": 0, "delivered": 0,
  "uniqueOpens": 0, "totalOpens": 0, "openRate": 0,
  "uniqueClicks": 0, "totalClicks": 0, "clickRate": 0, "ctor": 0,
  "bounced": 0, "complained": 0, "unsubscribed": 0
}
```

`GET /api/customers/{id}/engagement` (for the drawer) suggested shape:

```json
{
  "emailsReceived": 0, "uniqueOpens": 0, "openRate": 0,
  "uniqueClicks": 0, "clickRate": 0,
  "lastOpenedAt": null, "campaignsReceived": 0, "unsubscribed": false
}
```

## 5. Accuracy & privacy caveats (important)

- **Opens undercount and over-count.** Image blocking suppresses opens; **Apple Mail Privacy Protection (MPP)** and corporate scanners pre-fetch the pixel, inflating opens with non-human "machine opens." Recommend flagging machine opens (`is_machine`) by user-agent/IP heuristics and reporting human opens separately. Treat open rate as directional, click rate as reliable.
- **Clicks are trustworthy** but bots/security scanners can pre-click links; same `is_machine` filtering applies.
- Store IP/user-agent only as needed for bot filtering; consider truncation/retention limits for privacy compliance.
- Respect unsubscribed recipients (no tracking value, but pixel/redirect still resolve gracefully).

## 6. Optional: delivery / bounce / complaint (ESP webhook)

Opens/clicks cover engagement; **delivery, bounce, and complaint** come from the sending provider (SES/SendGrid/Postmark). A single signed inbound receiver — `POST /api/track/esp` — can ingest those events into the same `crm_email_events` table, populating `deliveredCount`, `bouncedCount`, `complainedCount`. Recommended as a fast-follow since the counters already exist.

## 7. Send-pipeline changes

1. Before send, persist each unique link → `crm_email_links`, rewrite `<a href>` to `/api/track/c/{token}` (skip unsubscribe/preference links).
2. Append the open pixel to the body.
3. Generate a per-recipient signed token at fan-out.

These run inside the existing send job; no change to the campaign create/send API contract.

## 8. Rollout (phased)

1. **Phase 1 — Opens:** pixel endpoint + injection + unique/total counters → analytics open rate goes live.
2. **Phase 2 — Clicks:** link table + rewrite + redirect endpoint → click rate / CTOR live.
3. **Phase 3 — Per-recipient:** `/api/customers/{id}/engagement` → customer drawer Engagement panel goes real.
4. **Phase 4 — Delivery events (optional):** ESP webhook → delivered/bounced/complained.

## 9. Acceptance criteria

- A sent campaign with N recipients records opens on pixel load and clicks on link follow, deduped per recipient.
- `GET /api/campaigns/{id}/analytics` returns non-zero, accurate unique/total opens and clicks.
- `GET /api/customers/{id}/engagement` returns real figures for a recipient.
- Tracking tokens cannot be forged or enumerated; tampered tokens fail closed (GIF/redirect still served, no event recorded).
- Machine/prefetch opens are flagged and excludable from reported rates.

## 10. Downstream (frontend) impact — for awareness only

Once Phases 1–3 land, the following stop needing placeholders: campaign analytics, the dashboard engagement chart/KPIs, and the customer-drawer Engagement panel. No frontend changes are requested as part of this proposal.
