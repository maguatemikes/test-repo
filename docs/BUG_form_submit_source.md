# Bug: public form submit sets `source: csv_import` instead of `source: form`

**Component:** crm-api — `POST /api/public/forms/{slug}/submit`
**Severity:** Medium — submissions succeed, but they're mis-categorized, which breaks source-based filtering and segmentation.

---

## Summary
A contact created via a **public form submission** is stored with **`source: csv_import`**. It should be **`source: form`** (or a form-specific source). The submission itself works — the contact is created and lands in the customer list — but the wrong `source` makes it invisible to anything that filters on form-sourced contacts.

## Reproduce
1. Submit the public form (any embed/hosted form), e.g.:
   ```
   POST https://staging.netx.cc/api/public/forms/newsletter-signup-test/submit
   Content-Type: application/json
   { "email": "vercel-probe@example.com", "displayName": "Vercel Probe", "fields": { "email": "vercel-probe@example.com" } }
   → 201 { "ok": true }
   ```
2. Look up the created contact in the org's customer list (org 1 / WFE).
3. **Actual:** the contact's `source` is **`csv_import`**.
4. **Expected:** `source` should be **`form`**.

## Impact
- **Customer "source = form" filter** doesn't show form submissions (they're filed under `csv_import`).
- **"Form Lead" segment** (rule `source = form`) won't enrol new submissions → the segment silently stops growing, and form-triggered automations/sends that rely on it miss new leads.
- Any analytics/reporting that splits acquisition by source will misattribute form signups to CSV import.

## Root cause (where to look)
The `source` is assigned **server-side by crm-api** when the public submit creates the contact — it's defaulting to `csv_import`. The frontend is **not** involved: the submit payload contains only `{ email, displayName, fields }` and never sends a `source`, and the BFF proxy passes the body through unchanged. So the fix is entirely in the crm-api submit handler.

## Suggested fix
In `POST /api/public/forms/{slug}/submit`, set the created/updated contact's `source` to **`form`** (or, if finer attribution is wanted, `form:{slug}`). Confirm existing form-sourced contacts vs. the segment rule so the "Form Lead" segment matches going forward.

## Notes
- Frontend behaviour is correct — no change needed there.
- Verified on staging: the submit returns `201 {ok:true}` and the contact appears in the customer list; only the `source` value is wrong.
