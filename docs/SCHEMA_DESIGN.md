# Schema Design Decisions

Why each non-obvious choice was made. Read alongside `src/lib/db/schema.ts` and `migrations/0001_create_crm_tables.sql`.

## 1. Multi-tenant isolation in application code, not the database

MySQL has no row-level security (Postgres has RLS). Every tenant-scoped table carries `organization_id` and every query must filter by it.

**The pattern:** a single repository helper accepts the current `organization_id` and applies it. Never concatenate org_id into SQL strings. Integration tests assert no method returns rows from another org.

**Consequence:** cross-tenant data leakage is the highest-severity risk in the project. Mitigated by code review, repository discipline, and tests.

## 2. Customers are a first-class table — not aggregated from `netx_orders`

NetX's `CustomerHub` aggregates customer state from `netx_orders` and `netx_customer_meta` on every load. That's fine for one tenant but becomes painful at SaaS scale (you don't want to re-aggregate a million orders just to render a customer profile).

**Choice:** the new `customers` table has denormalized lifetime metrics (`lifetime_spend`, `order_count`, `last_order_at`). NetX's order sync updates these on every order ingest.

**Tradeoff:** double-write between `customers` and `netx_orders`. Acceptable because reads dominate by 50:1 in this workload.

## 3. Segments use JSON for rule definitions

Rule trees nest arbitrarily ("VIP AND (spend > 500 OR opened email in 14d)"). Three options:

- **Relational table per condition** — requires a recursive query to read; painful for a 6-level deep group
- **EAV (entity-attribute-value)** — same problem, worse performance
- **JSON column** — natural fit; one row per segment; MySQL 8 supports JSON path operators and indexing

**Choice:** JSON. The resolver lives in TypeScript (`src/lib/segments/`), reads the JSON, translates to SQL, executes against `customers`. The resolved SQL itself uses parameterized queries — no JSON-string concatenation.

## 4. Segment membership is materialized in `segment_members`

Resolving a segment on every campaign send is expensive — for a 100k-contact org, even a 200ms query times 10 active segments is wasted CPU.

**Choice:** materialized membership cached in `segment_members`. The segment engine refreshes membership every `refresh_interval_seconds` (default 5 min) OR on customer-event triggers.

**Tradeoff:** stale segments for up to 5 min. Acceptable for marketing use cases. Critical sends (transactional, abandoned cart) bypass cache and resolve live.

## 5. `emails` table is denormalized for fast counters

Per-recipient email status (sent / opened / clicked / bounced) lives on `emails`, not derived from `email_events`. The granular event log is in `email_events`.

**Why both:** Counters on `emails` enable fast "show me this customer's last 10 sends" queries. Granular events enable "what was the click-through rate by hour" analytics.

**Update path:** ESP webhook → write `email_events` row → atomic update of `emails.status` + counters. The `campaigns` aggregate counters update on a delayed roll-up.

## 6. Automations modeled as a tree, not a flat list

Automation flows have branches (condition node with yes/no paths). A flat ordered list can't represent a branch.

**Choice:** `automation_steps` self-references via `parent_step_id`, with `branch` column for "yes"/"no" branches off conditions.

**Tradeoff:** reading the full flow requires a recursive CTE. The web app caches the resolved tree in JSON-shaped form on the client.

## 7. `automation_runs` includes a unique-active constraint

`UNIQUE (automation_id, customer_id, status)` prevents a customer from being enrolled twice in the same active run. The `reentry_policy` field on `automations` controls what happens on re-trigger.

## 8. Forms hosted at a public slug

Each form gets a public-facing `/f/<slug>` URL. The slug is org-scoped, not globally unique, because two tenants can both have a "newsletter" form.

The hosted form URL is org-namespaced via the routing structure or subdomain at deploy time — not in this schema.

## 9. Suppressions are per-org

The reference doc mentions this explicitly. Per-org suppression means a customer who unsubscribed from Tenant A is still subscribable in Tenant B. Hard bounces and complaints at the ESP layer are separate (handled by ESP itself, not this table).

## 10. Sending domains track DKIM records as JSON

Each domain needs multiple DKIM CNAMEs (one for the ESP). The `dkim_records_json` array holds them with verification status per record. UI iterates and shows verification chips per record.

## 11. Audit logs are simple — no schema-versioning by table

`audit_logs` stores arbitrary `target_type` + `target_id` + `metadata_json` rather than a per-table audit table. Tradeoff: less structured queries, but a single index covers all audit reads.

## 12. No SMS tables in Phase 1

SMS is deferred to Phase 2. When we add it, the pattern mirrors emails:

- `sms` table per recipient
- `sms_events` granular log
- `senders` extended with phone-number senders

## 13. No `permissions` table — roles are an ENUM

Five fixed roles (`super_admin`, `admin`, `marketing_manager`, `analyst`, `read_only`) cover Phase 1. If we need custom permissions later we'd add a `role_permissions` join table.

## 14. Why DATETIME not TIMESTAMP

MySQL's `TIMESTAMP` is bounded by 2038 (Y2K38), automatically converts to UTC, and has timezone semantics that depend on the connection. `DATETIME` stores exactly what you give it.

**Choice:** DATETIME everywhere. All timestamps are stored in UTC by application convention. The DB is timezone-agnostic.

## 15. `BIGINT` IDs everywhere, not `UUID`

Sequential BIGINT keys play well with InnoDB's clustered B-tree indexes. UUIDs cause page fragmentation on insert.

**Tradeoff:** IDs are guessable in URLs. Mitigated by Clerk's auth (every route is permission-checked).

If we need non-guessable IDs in public URLs (form slugs, unsubscribe tokens, hosted page URLs), we use separate VARCHAR slug / token columns alongside the BIGINT id.

## 16. ENUM columns where the values are stable

For status fields with a fixed small set of values (`active`, `paused`, `archived`), ENUM is space-efficient and self-documenting. The tradeoff is ALTER TABLE to add a value — but we'd version those as proper migrations anyway.

## 17. The internal organization has `id = 1`

Pinned explicitly in `0003_seed_baseline.sql`. The `0002_netx_org_id_retrofit.sql` migration backfills existing NetX rows with `organization_id = 1`. If you change one, change the other.

## Open questions deferred to Phase 2 / 3

- **Customer-level event log** — currently we have email engagement aggregated onto `customers` and granular per-send events on `email_events`. A unified `customer_events` table (every interaction, not just emails) is the eventual goal but expensive to scale. Deferred until we have a clear use case.
- **Time-series storage for analytics** — if `email_events` grows past hundreds of millions of rows, querying it from MySQL gets painful. ClickHouse or TimescaleDB on Postgres is the eventual answer.
- **Stripe subscription/invoice tables** — for v1 we delegate to Stripe (just store `stripe_subscription_id` on `organizations`). Caching invoices locally is a Phase 2 nice-to-have.
- **Soft-delete pattern** — currently we use `archived` flags. A unified `deleted_at` column across all tables would standardize but isn't in v1.
