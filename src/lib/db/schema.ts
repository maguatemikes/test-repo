/**
 * Drizzle schema sketch for the new CRM tables.
 *
 * IMPORTANT: NetX's existing tables (netx_orders, netx_customer_meta, etc.)
 * are NOT defined here. The web app reads them via raw SQL or by extending
 * this file once the joint schema migration adds organization_id.
 *
 * This file currently models only the NEW CRM tables. The first wave:
 *   - organizations  (tenant root)
 *   - customers      (replaces email-as-key model)
 *   - lists / list_members
 *   - segments
 *
 * Run `pnpm db:generate` after editing to produce migrations,
 * then `pnpm db:migrate` to apply them.
 */
import {
  mysqlTable, varchar, int, bigint, decimal, datetime, json, boolean, text, index, primaryKey, mysqlEnum,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const organizations = mysqlTable("organizations", {
  id:        bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  slug:      varchar("slug", { length: 64 }).notNull().unique(),
  name:      varchar("name", { length: 200 }).notNull(),
  plan:      varchar("plan", { length: 32 }).notNull().default("free"),
  status:    varchar("status", { length: 16 }).notNull().default("active"),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const users = mysqlTable("users", {
  id:             bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  clerkUserId:    varchar("clerk_user_id", { length: 64 }).notNull().unique(),
  email:          varchar("email", { length: 255 }).notNull().unique(),
  displayName:    varchar("display_name", { length: 200 }),
  createdAt:      datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const organizationMembers = mysqlTable(
  "organization_members",
  {
    orgId:  bigint("organization_id", { mode: "number" }).notNull().references(() => organizations.id),
    userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id),
    role:   mysqlEnum("role", ["super_admin", "admin", "marketing_manager", "analyst", "read_only"]).notNull(),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ pk: primaryKey({ columns: [t.orgId, t.userId] }) })
);

export const customers = mysqlTable(
  "customers",
  {
    id:               bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orgId:            bigint("organization_id", { mode: "number" }).notNull(),
    email:            varchar("email", { length: 255 }).notNull(),
    displayName:      varchar("display_name", { length: 200 }),
    phone:            varchar("phone", { length: 32 }),
    isVip:            boolean("is_vip").notNull().default(false),
    isSubscribed:     boolean("is_subscribed").notNull().default(true),
    lifetimeSpend:    decimal("lifetime_spend", { precision: 12, scale: 2 }).notNull().default("0"),
    orderCount:       int("order_count").notNull().default(0),
    refundCount:      int("refund_count").notNull().default(0),
    firstOrderAt:     datetime("first_order_at"),
    lastOrderAt:      datetime("last_order_at"),
    lastEngagementAt: datetime("last_engagement_at"),
    notes:            text("notes"),
    tagsCsv:          varchar("tags_csv", { length: 500 }),
    createdAt:        datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt:        datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({
    uqOrgEmail: index("uq_customers_org_email").on(t.orgId, t.email),
    ixVip:      index("ix_customers_vip").on(t.orgId, t.isVip),
    ixLastOrd:  index("ix_customers_last_ord").on(t.orgId, t.lastOrderAt),
  })
);

export const lists = mysqlTable("lists", {
  id:        bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId:     bigint("organization_id", { mode: "number" }).notNull(),
  name:      varchar("name", { length: 200 }).notNull(),
  source:    varchar("source", { length: 32 }).notNull().default("manual"),
  archived:  boolean("archived").notNull().default(false),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const listMembers = mysqlTable(
  "list_members",
  {
    listId:     bigint("list_id", { mode: "number" }).notNull().references(() => lists.id),
    customerId: bigint("customer_id", { mode: "number" }).notNull().references(() => customers.id),
    addedAt:    datetime("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  t => ({ pk: primaryKey({ columns: [t.listId, t.customerId] }) })
);

export const segments = mysqlTable("segments", {
  id:               bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId:            bigint("organization_id", { mode: "number" }).notNull(),
  name:             varchar("name", { length: 200 }).notNull(),
  ruleDefinition:   json("rule_definition").notNull(),
  memberCount:      int("member_count").notNull().default(0),
  lastRefreshedAt:  datetime("last_refreshed_at"),
  createdAt:        datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
