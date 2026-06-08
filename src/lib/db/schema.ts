/**
 * CRM Phase 1 Drizzle schema.
 *
 * Conventions:
 *   - All money columns use DECIMAL(12,2).
 *   - All timestamps are MySQL DATETIME (not TIMESTAMP Ã¢â‚¬â€ avoids 2038 + timezone surprises).
 *   - Every tenant-scoped table carries `organization_id` and indexes start with it.
 *   - JSON columns are used for: segment rules, automation step config, form fields,
 *     marketplace content, webhook event lists.
 *   - NetX's existing `netx_*` tables are NOT modeled here; they are read via raw SQL
 *     until/unless they migrate to this codebase. The retrofit migration
 *     (migrations/0002_netx_org_id_retrofit.sql) adds `organization_id` to them.
 *
 * After editing this file:
 *   pnpm db:generate    # produces a SQL migration in ./drizzle
 *   pnpm db:migrate     # applies migrations to DATABASE_URL
 */

import {
  mysqlTable, varchar, int, bigint, decimal, datetime, json, boolean, text,
  index, primaryKey, mysqlEnum, uniqueIndex,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ============================================================
// 1. Tenancy & auth
// ============================================================

export const plans = mysqlTable("crm_plans", {
  id:                   bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  slug:                 varchar("slug", { length: 32 }).notNull().unique(),
  name:                 varchar("name", { length: 100 }).notNull(),
  contactsLimit:        int("contacts_limit").notNull(),
  sendsPerMonthLimit:   int("sends_per_month_limit").notNull(),
  priceMonthlyUsd:      decimal("price_monthly_usd", { precision: 10, scale: 2 }).notNull(),
  featuresJson:         json("features_json"),
  active:               boolean("active").notNull().default(true),
  createdAt:            datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const organizations = mysqlTable("crm_organizations", {
  id:                   bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  slug:                 varchar("slug", { length: 64 }).notNull().unique(),
  name:                 varchar("name", { length: 200 }).notNull(),
  planId:               bigint("plan_id", { mode: "number" }).references(() => plans.id),
  status:               mysqlEnum("status", ["active", "trial", "past_due", "suspended", "cancelled"]).notNull().default("trial"),
  stripeCustomerId:     varchar("stripe_customer_id", { length: 64 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 64 }),
  billingEmail:         varchar("billing_email", { length: 255 }),
  trialEndsAt:          datetime("trial_ends_at"),
  createdAt:            datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt:            datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const users = mysqlTable("crm_users", {
  id:                   bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  clerkUserId:          varchar("clerk_user_id", { length: 64 }).notNull().unique(),
  email:                varchar("email", { length: 255 }).notNull().unique(),
  displayName:          varchar("display_name", { length: 200 }),
  timeZone:             varchar("time_zone", { length: 64 }).notNull().default("UTC"),
  lastLoginAt:          datetime("last_login_at"),
  createdAt:            datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const organizationMembers = mysqlTable("crm_organization_members",
  {
    orgId:      bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
    userId:     bigint("user_id", { mode: "number" }).notNull().references(() => users.id),
    role:       mysqlEnum("role", ["super_admin", "admin", "marketing_manager", "analyst", "read_only"]).notNull(),
    invitedBy:  bigint("invited_by", { mode: "number" }).references(() => users.id),
    joinedAt:   datetime("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ pk: primaryKey({ columns: [t.orgId, t.userId] }) })
);

export const apiKeys = mysqlTable("crm_api_keys",
  {
    id:           bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:        bigint("organization_id", { mode: "number" }).notNull(),
    keyPrefix:    varchar("key_prefix", { length: 12 }).notNull(),  // first 8 chars, for UI
    keyHash:      varchar("key_hash", { length: 64 }).notNull(),    // sha256 of full key
    name:         varchar("name", { length: 100 }).notNull(),
    scopesJson:   json("scopes_json"),
    lastUsedAt:   datetime("last_used_at"),
    revokedAt:    datetime("revoked_at"),
    createdAt:    datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ ixOrg: index("ix_api_keys_org").on(t.orgId) })
);

export const usageMeters = mysqlTable("crm_usage_meters",
  {
    id:          bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:       bigint("organization_id", { mode: "number" }).notNull(),
    periodMonth: varchar("period_month", { length: 7 }).notNull(), // YYYY-MM
    metric:      mysqlEnum("metric", ["contacts", "sends", "sms"]).notNull(),
    value:       int("value").notNull().default(0),
    updatedAt:   datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ uqOrgPeriodMetric: uniqueIndex("uq_usage_org_period_metric").on(t.orgId, t.periodMonth, t.metric) })
);

// ============================================================
// 2. Customers
// ============================================================

export const customers = mysqlTable("crm_customers",
  {
    id:                  bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:               bigint("organization_id", { mode: "number" }).notNull(),
    email:               varchar("email", { length: 255 }).notNull(),
    displayName:         varchar("display_name", { length: 200 }),
    firstName:           varchar("first_name", { length: 100 }),
    lastName:            varchar("last_name", { length: 100 }),
    phone:               varchar("phone", { length: 32 }),
    company:             varchar("company", { length: 200 }),

    // Marketing status
    isVip:               boolean("is_vip").notNull().default(false),
    isSubscribed:        boolean("is_subscribed").notNull().default(true),
    subscribedAt:        datetime("subscribed_at"),
    unsubscribedAt:      datetime("unsubscribed_at"),
    suppressionReason:   mysqlEnum("suppression_reason", ["bounce", "complaint", "manual", "unsubscribe"]),
    doubleOptInAt:       datetime("double_opt_in_at"),
    consentSource:       varchar("consent_source", { length: 100 }),

    // Lifetime metrics (denormalized for fast read)
    lifetimeSpend:       decimal("lifetime_spend", { precision: 12, scale: 2 }).notNull().default("0"),
    orderCount:          int("order_count").notNull().default(0),
    refundCount:         int("refund_count").notNull().default(0),
    firstOrderAt:        datetime("first_order_at"),
    lastOrderAt:         datetime("last_order_at"),
    lastEngagementAt:    datetime("last_engagement_at"),

    // Operator overlay
    notes:               text("notes"),
    source:              varchar("source", { length: 64 }), // shopify / form / csv / api / manual
    primaryChannel:      varchar("primary_channel", { length: 64 }), // Website / eBay / WooCommerce / Phone …
    sourceMetadataJson:  json("source_metadata_json"),

    createdAt:           datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt:           datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({
    uqOrgEmail:   uniqueIndex("uq_customers_org_email").on(t.orgId, t.email),
    ixVip:        index("ix_customers_org_vip").on(t.orgId, t.isVip),
    ixSubscribed: index("ix_customers_org_subscribed").on(t.orgId, t.isSubscribed),
    ixLastOrder:  index("ix_customers_org_last_order").on(t.orgId, t.lastOrderAt),
    ixLastEng:    index("ix_customers_org_last_eng").on(t.orgId, t.lastEngagementAt),
  })
);

export const customerTags = mysqlTable("crm_customer_tags",
  {
    id:         bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:      bigint("organization_id", { mode: "number" }).notNull(),
    name:       varchar("name", { length: 64 }).notNull(),  // already normalized (lowercase, dashed)
    color:      varchar("color", { length: 16 }),
    createdAt:  datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ uqOrgName: uniqueIndex("uq_customer_tags_org_name").on(t.orgId, t.name) })
);

export const customerTagLinks = mysqlTable("crm_customer_tag_links",
  {
    customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id),
    tagId:      bigint("tag_id", { mode: "number" }).notNull().references(() => customerTags.id),
    addedAt:    datetime("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({
    pk: primaryKey({ columns: [t.customerId, t.tagId] }),
    ixTag: index("ix_customer_tag_links_tag").on(t.tagId),
  })
);

export const customerAddresses = mysqlTable("crm_customer_addresses",
  {
    id:          bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    customerId:  bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id),
    kind:        mysqlEnum("kind", ["shipping", "billing", "other"]).notNull().default("shipping"),
    isDefault:   boolean("is_default").notNull().default(false),
    line1:       varchar("line1", { length: 200 }),
    line2:       varchar("line2", { length: 200 }),
    city:        varchar("city", { length: 100 }),
    state:       varchar("state", { length: 100 }),
    postalCode:  varchar("postal_code", { length: 32 }),
    country:     varchar("country", { length: 2 }),  // ISO 3166-1 alpha-2
    createdAt:   datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ ixCustomer: index("ix_customer_addresses_customer").on(t.customerId) })
);

export const customerAliases = mysqlTable("crm_customer_aliases",
  {
    orgId:           bigint("organization_id", { mode: "number" }).notNull(),
    aliasEmail:      varchar("alias_email", { length: 255 }).notNull(),
    canonicalEmail:  varchar("canonical_email", { length: 255 }).notNull(),
    mergedAt:        datetime("merged_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    mergedBy:        bigint("merged_by", { mode: "number" }).references(() => users.id),
  },
  t => ({
    pk: primaryKey({ columns: [t.orgId, t.aliasEmail] }),
    ixCanonical: index("ix_customer_aliases_canonical").on(t.orgId, t.canonicalEmail),
  })
);

// ============================================================
// 3. Audience (lists + segments)
// ============================================================

export const lists = mysqlTable("crm_lists",
  {
    id:          bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:       bigint("organization_id", { mode: "number" }).notNull(),
    name:        varchar("name", { length: 200 }).notNull(),
    description: varchar("description", { length: 500 }),
    source:      varchar("source", { length: 32 }).notNull().default("manual"), // manual / csv / form / api
    archived:    boolean("archived").notNull().default(false),
    memberCount: int("member_count").notNull().default(0),
    createdBy:   bigint("created_by", { mode: "number" }).references(() => users.id),
    createdAt:   datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ ixOrg: index("ix_lists_org").on(t.orgId, t.archived) })
);

export const listMembers = mysqlTable("crm_list_members",
  {
    listId:     bigint("list_id", { mode: "number" }).notNull().references(() => lists.id),
    customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id),
    addedAt:    datetime("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({
    pk: primaryKey({ columns: [t.listId, t.customerId] }),
    ixCustomer: index("ix_list_members_customer").on(t.customerId),
  })
);

export const segments = mysqlTable("crm_segments",
  {
    id:                     bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:                  bigint("organization_id", { mode: "number" }).notNull(),
    name:                   varchar("name", { length: 200 }).notNull(),
    description:            varchar("description", { length: 500 }),
    /**
     * Rule tree as JSON. Shape:
     *   { op: "AND" | "OR", rules: Array<Rule | Group> }
     *   Rule = { field, operator, value }
     * Resolver lives in src/lib/segments/.
     */
    ruleDefinition:         json("rule_definition").notNull(),
    memberCount:            int("member_count").notNull().default(0),
    lastRefreshedAt:        datetime("last_refreshed_at"),
    refreshIntervalSeconds: int("refresh_interval_seconds").notNull().default(300),
    archived:               boolean("archived").notNull().default(false),
    createdBy:              bigint("created_by", { mode: "number" }).references(() => users.id),
    createdAt:              datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt:              datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ ixOrg: index("ix_segments_org").on(t.orgId, t.archived) })
);

/** Materialized membership for fast send-time lookups. Refreshed by segment engine. */
export const segmentMembers = mysqlTable("crm_segment_members",
  {
    segmentId:  bigint("segment_id", { mode: "number" }).notNull().references(() => segments.id),
    customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id),
    addedAt:    datetime("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({
    pk: primaryKey({ columns: [t.segmentId, t.customerId] }),
    ixCustomer: index("ix_segment_members_customer").on(t.customerId),
  })
);

// ============================================================
// 4. Email infrastructure
// ============================================================

export const sendingDomains = mysqlTable("crm_sending_domains",
  {
    id:              bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:           bigint("organization_id", { mode: "number" }).notNull(),
    domain:          varchar("domain", { length: 255 }).notNull(),
    status:          mysqlEnum("status", ["pending", "verified", "failed", "disabled"]).notNull().default("pending"),
    dkimRecordsJson: json("dkim_records_json"),
    dmarcRecord:     varchar("dmarc_record", { length: 500 }),
    verifiedAt:      datetime("verified_at"),
    lastCheckedAt:   datetime("last_checked_at"),
    createdAt:       datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ uqOrgDomain: uniqueIndex("uq_sending_domains_org_domain").on(t.orgId, t.domain) })
);

export const senders = mysqlTable("crm_senders",
  {
    id:               bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:            bigint("organization_id", { mode: "number" }).notNull(),
    sendingDomainId:  bigint("sending_domain_id", { mode: "number" }).references(() => sendingDomains.id),
    fromName:         varchar("from_name", { length: 100 }).notNull(),
    fromEmail:        varchar("from_email", { length: 255 }).notNull(),
    replyToEmail:     varchar("reply_to_email", { length: 255 }),
    isDefault:        boolean("is_default").notNull().default(false),
    createdAt:        datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ ixOrg: index("ix_senders_org").on(t.orgId) })
);

export const templates = mysqlTable("crm_templates",
  {
    id:             bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:          bigint("organization_id", { mode: "number" }).notNull(),
    name:           varchar("name", { length: 200 }).notNull(),
    category:       varchar("category", { length: 64 }),
    subjectDefault: varchar("subject_default", { length: 500 }),
    /** Unlayer (or other builder) design JSON. The canonical source of truth. */
    designJson:     json("design_json"),
    /** Rendered HTML for sending. Re-rendered from designJson on save. */
    htmlBody:       text("html_body"),
    /** Plain-text fallback. */
    textBody:       text("text_body"),
    archived:       boolean("archived").notNull().default(false),
    createdAt:      datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt:      datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ ixOrg: index("ix_templates_org").on(t.orgId, t.archived) })
);

export const suppressions = mysqlTable("crm_suppressions",
  {
    id:           bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:        bigint("organization_id", { mode: "number" }).notNull(),
    email:        varchar("email", { length: 255 }).notNull(),
    reason:       mysqlEnum("reason", ["bounce", "complaint", "manual", "unsubscribe", "spam_trap"]).notNull(),
    source:       varchar("source", { length: 100 }), // campaign-id, ESP webhook, etc.
    suppressedAt: datetime("suppressed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ uqOrgEmail: uniqueIndex("uq_suppressions_org_email").on(t.orgId, t.email) })
);

// ============================================================
// 5. Campaigns + sending
// ============================================================

export const campaigns = mysqlTable("crm_campaigns",
  {
    id:                   bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:                bigint("organization_id", { mode: "number" }).notNull(),

    type:                 mysqlEnum("type", ["regular", "automation", "transactional"]).notNull().default("regular"),
    name:                 varchar("name", { length: 200 }).notNull(),
    subject:              varchar("subject", { length: 500 }),
    preheader:            varchar("preheader", { length: 500 }),

    senderId:             bigint("sender_id", { mode: "number" }).references(() => senders.id),
    templateId:           bigint("template_id", { mode: "number" }).references(() => templates.id),
    /** Audience: pick one of these or both. Exclude segment removes recipients. */
    audienceListId:       bigint("audience_list_id", { mode: "number" }).references(() => lists.id),
    audienceSegmentId:    bigint("audience_segment_id", { mode: "number" }).references(() => segments.id),
    excludeSegmentId:     bigint("exclude_segment_id", { mode: "number" }).references(() => segments.id),

    status:               mysqlEnum("status", ["draft", "scheduled", "sending", "sent", "failed", "cancelled"]).notNull().default("draft"),
    scheduledAt:          datetime("scheduled_at"),
    sentAt:               datetime("sent_at"),

    /** Materialized counters Ã¢â‚¬â€ updated as email events arrive. */
    recipientsCount:      int("recipients_count").notNull().default(0),
    deliveredCount:       int("delivered_count").notNull().default(0),
    openedCount:          int("opened_count").notNull().default(0),
    clickedCount:         int("clicked_count").notNull().default(0),
    unsubscribedCount:    int("unsubscribed_count").notNull().default(0),
    bouncedCount:         int("bounced_count").notNull().default(0),
    complainedCount:      int("complained_count").notNull().default(0),
    revenueAttributedUsd: decimal("revenue_attributed_usd", { precision: 12, scale: 2 }).notNull().default("0"),

    createdBy:            bigint("created_by", { mode: "number" }).references(() => users.id),
    createdAt:            datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt:            datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({
    ixOrgStatus: index("ix_campaigns_org_status").on(t.orgId, t.status),
    ixOrgSentAt: index("ix_campaigns_org_sent_at").on(t.orgId, t.sentAt),
  })
);

/** Per-recipient send record. One row per (campaign, customer). */
export const emails = mysqlTable("crm_emails",
  {
    id:               bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:            bigint("organization_id", { mode: "number" }).notNull(),
    campaignId:       bigint("campaign_id", { mode: "number" }).notNull().references(() => campaigns.id),
    customerId:       bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id),
    messageId:        varchar("message_id", { length: 200 }), // ESP message id
    status:           mysqlEnum("status", [
      "queued", "sent", "delivered", "opened", "clicked", "bounced", "complained", "unsubscribed", "failed",
    ]).notNull().default("queued"),
    sentAt:           datetime("sent_at"),
    deliveredAt:      datetime("delivered_at"),
    firstOpenedAt:    datetime("first_opened_at"),
    firstClickedAt:   datetime("first_clicked_at"),
    bouncedAt:        datetime("bounced_at"),
    unsubscribedAt:   datetime("unsubscribed_at"),
    openCount:        int("open_count").notNull().default(0),
    clickCount:       int("click_count").notNull().default(0),
  },
  t => ({
    ixCampaign:         index("ix_emails_campaign").on(t.campaignId),
    ixCustomer:         index("ix_emails_customer").on(t.customerId),
    ixOrgStatus:        index("ix_emails_org_status").on(t.orgId, t.status),
    uqCampaignCustomer: uniqueIndex("uq_emails_campaign_customer").on(t.campaignId, t.customerId),
  })
);

/** Granular event log for emails. One row per open/click/bounce/etc. */
export const emailEvents = mysqlTable("crm_email_events",
  {
    id:           bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:        bigint("organization_id", { mode: "number" }).notNull(),
    emailId:      bigint("email_id", { mode: "number" }).notNull().references(() => emails.id),
    type:         mysqlEnum("type", ["sent", "delivered", "open", "click", "bounce", "complaint", "unsubscribe"]).notNull(),
    occurredAt:   datetime("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    /** type=click Ã¢â€ â€™ url, type=bounce Ã¢â€ â€™ bounce_reason, type=complaint Ã¢â€ â€™ feedback_loop_arf, etc. */
    metadataJson: json("metadata_json"),
    ipAddress:    varchar("ip_address", { length: 64 }),
    userAgent:    varchar("user_agent", { length: 500 }),
  },
  t => ({
    ixEmail:   index("ix_email_events_email").on(t.emailId, t.type),
    ixOrgType: index("ix_email_events_org_type").on(t.orgId, t.type, t.occurredAt),
  })
);

// ============================================================
// 6. Automations
// ============================================================

export const automations = mysqlTable("crm_automations",
  {
    id:                bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:             bigint("organization_id", { mode: "number" }).notNull(),
    name:              varchar("name", { length: 200 }).notNull(),
    description:       varchar("description", { length: 500 }),
    triggerType:       mysqlEnum("trigger_type", [
      "contact_added", "form_submitted", "product_viewed", "added_to_cart",
      "checkout_started", "purchase_completed", "birthday", "custom_event",
    ]).notNull(),
    triggerConfigJson: json("trigger_config_json"),
    status:            mysqlEnum("status", ["draft", "active", "paused", "archived"]).notNull().default("draft"),
    /** "once" Ã¢â‚¬â€ customer enrolls once ever. "always" Ã¢â‚¬â€ re-enrolls on every trigger. "after_completion" Ã¢â‚¬â€ re-enrolls after exit. */
    reentryPolicy:     mysqlEnum("reentry_policy", ["once", "always", "after_completion"]).notNull().default("once"),

    enrolledCount:     int("enrolled_count").notNull().default(0),
    completedCount:    int("completed_count").notNull().default(0),
    conversionCount:   int("conversion_count").notNull().default(0),

    createdBy:         bigint("created_by", { mode: "number" }).references(() => users.id),
    createdAt:         datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt:         datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ ixOrgStatus: index("ix_automations_org_status").on(t.orgId, t.status) })
);

export const automationSteps = mysqlTable("crm_automation_steps",
  {
    id:           bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    automationId: bigint("automation_id", { mode: "number" }).notNull().references(() => automations.id),
    parentStepId: bigint("parent_step_id", { mode: "number" }),  // self-ref, set after insert
    /** "yes"/"no" for steps emerging from a condition node, otherwise null. */
    branch:       varchar("branch", { length: 16 }),
    orderIndex:   int("order_index").notNull().default(0),
    type:         mysqlEnum("type", ["action", "delay", "condition", "end"]).notNull(),
    /** Per-type configuration. action={send_email, template_id, sender_id, ...}; delay={duration_seconds}; condition={rules}. */
    configJson:   json("config_json").notNull(),
  },
  t => ({ ixAutomation: index("ix_automation_steps_automation").on(t.automationId) })
);

export const automationRuns = mysqlTable("crm_automation_runs",
  {
    id:              bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:           bigint("organization_id", { mode: "number" }).notNull(),
    automationId:    bigint("automation_id", { mode: "number" }).notNull().references(() => automations.id),
    customerId:      bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id),
    currentStepId:   bigint("current_step_id", { mode: "number" }).references(() => automationSteps.id),
    status:          mysqlEnum("status", ["active", "waiting", "completed", "exited", "errored"]).notNull().default("active"),
    enrolledAt:      datetime("enrolled_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastAdvancedAt:  datetime("last_advanced_at"),
    /** When this run's current_step is a delay, the timestamp at which it should advance. */
    waitingUntil:    datetime("waiting_until"),
    completedAt:     datetime("completed_at"),
    exitReason:      varchar("exit_reason", { length: 100 }),
  },
  t => ({
    ixAutoCust:  uniqueIndex("uq_automation_runs_auto_cust_active").on(t.automationId, t.customerId, t.status),
    ixWaiting:   index("ix_automation_runs_waiting").on(t.status, t.waitingUntil),
  })
);

// ============================================================
// 7. Forms
// ============================================================

export const forms = mysqlTable("crm_forms",
  {
    id:                  bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:               bigint("organization_id", { mode: "number" }).notNull(),
    slug:                varchar("slug", { length: 64 }).notNull(),  // public hosted URL slug
    name:                varchar("name", { length: 200 }).notNull(),
    type:                mysqlEnum("type", ["popup", "embed", "slide_in", "full_screen", "hosted"]).notNull().default("embed"),
    fieldsJson:          json("fields_json").notNull(),       // array of { name, label, type, required, options }
    designJson:          json("design_json"),                 // styling
    targetingJson:       json("targeting_json"),              // when/where to show (urls, exit-intent, geo, etc.)
    successBehaviorJson: json("success_behavior_json"),      // message vs redirect
    targetListId:        bigint("target_list_id", { mode: "number" }).references(() => lists.id),
    status:              mysqlEnum("status", ["draft", "active", "paused", "archived"]).notNull().default("draft"),
    impressions:         int("impressions").notNull().default(0),
    submissions:         int("submissions").notNull().default(0),
    createdAt:           datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt:           datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({
    uqOrgSlug:   uniqueIndex("uq_forms_org_slug").on(t.orgId, t.slug),
    ixOrgStatus: index("ix_forms_org_status").on(t.orgId, t.status),
  })
);

export const formSubmissions = mysqlTable("crm_form_submissions",
  {
    id:           bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:        bigint("organization_id", { mode: "number" }).notNull(),
    formId:       bigint("form_id", { mode: "number" }).notNull().references(() => forms.id),
    customerId:   bigint("customer_id", { mode: "number" }).references(() => customers.id),  // null until matched
    dataJson:     json("data_json").notNull(),
    sourceUrl:    varchar("source_url", { length: 500 }),
    ipAddress:    varchar("ip_address", { length: 64 }),
    userAgent:    varchar("user_agent", { length: 500 }),
    submittedAt:  datetime("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ ixForm: index("ix_form_submissions_form").on(t.formId, t.submittedAt) })
);

// ============================================================
// 8. Integrations + webhooks + audit
// ============================================================

export const integrations = mysqlTable("crm_integrations",
  {
    id:                   bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:                bigint("organization_id", { mode: "number" }).notNull(),
    type:                 mysqlEnum("type", [
      "shopify", "woocommerce", "bigcommerce", "amazon", "ebay", "veeqo",
      "stripe", "sendgrid", "resend", "ses", "twilio",
    ]).notNull(),
    name:                 varchar("name", { length: 200 }).notNull(),
    configJson:           json("config_json"),
    /** Encrypted at rest (KMS/DPAPI). Never log this. */
    credentialsEncrypted: text("credentials_encrypted"),
    status:               mysqlEnum("status", ["connected", "syncing", "error", "disconnected"]).notNull().default("connected"),
    lastSyncAt:           datetime("last_sync_at"),
    lastErrorMessage:     varchar("last_error_message", { length: 500 }),
    createdAt:            datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ ixOrgType: index("ix_integrations_org_type").on(t.orgId, t.type) })
);

export const webhooks = mysqlTable("crm_webhooks",
  {
    id:                   bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:                bigint("organization_id", { mode: "number" }).notNull(),
    url:                  varchar("url", { length: 500 }).notNull(),
    secret:               varchar("secret", { length: 100 }).notNull(),  // HMAC signing secret
    eventsSubscribedJson: json("events_subscribed_json").notNull(),
    status:               mysqlEnum("status", ["active", "paused", "failing"]).notNull().default("active"),
    lastDeliveryAt:       datetime("last_delivery_at"),
    failureCount:         int("failure_count").notNull().default(0),
    createdAt:            datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ ixOrg: index("ix_webhooks_org").on(t.orgId, t.status) })
);

export const auditLogs = mysqlTable("crm_audit_logs",
  {
    id:           bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:        bigint("organization_id", { mode: "number" }).notNull(),
    userId:       bigint("user_id", { mode: "number" }).references(() => users.id),
    action:       varchar("action", { length: 64 }).notNull(),         // e.g. "customer.tag_added"
    targetType:   varchar("target_type", { length: 32 }),              // e.g. "customer", "segment"
    targetId:     bigint("target_id", { mode: "number" }),
    metadataJson: json("metadata_json"),
    ipAddress:    varchar("ip_address", { length: 64 }),
    occurredAt:   datetime("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ ixOrgTime: index("ix_audit_logs_org_time").on(t.orgId, t.occurredAt) })
);
