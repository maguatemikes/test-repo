-- ==========================================================================
-- CRM Phase 1 — Create new tables
-- ==========================================================================
-- All tables prefixed with crm_ to keep them separate from NetX's netx_ tables.
--
-- Apply with:    mysql -h <host> -u <user> -p omnc < 0001_create_crm_tables.sql
-- Idempotent:    Yes (CREATE TABLE IF NOT EXISTS throughout)
-- Coordinates:   None — these are new tables, no impact on NetX
-- ==========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------------------------
-- 1. Tenancy & auth
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_plans (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  slug                    VARCHAR(32)     NOT NULL,
  name                    VARCHAR(100)    NOT NULL,
  contacts_limit          INT             NOT NULL,
  sends_per_month_limit   INT             NOT NULL,
  price_monthly_usd       DECIMAL(10,2)   NOT NULL,
  features_json           JSON            NULL,
  active                  TINYINT(1)      NOT NULL DEFAULT 1,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_plans_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_organizations (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  slug                    VARCHAR(64)     NOT NULL,
  name                    VARCHAR(200)    NOT NULL,
  plan_id                 BIGINT          NULL,
  status                  ENUM('active','trial','past_due','suspended','cancelled') NOT NULL DEFAULT 'trial',
  stripe_customer_id      VARCHAR(64)     NULL,
  stripe_subscription_id  VARCHAR(64)     NULL,
  billing_email           VARCHAR(255)    NULL,
  trial_ends_at           DATETIME        NULL,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_organizations_slug (slug),
  KEY ix_crm_organizations_plan (plan_id),
  CONSTRAINT fk_crm_organizations_plan FOREIGN KEY (plan_id) REFERENCES crm_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_users (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  clerk_user_id           VARCHAR(64)     NOT NULL,
  email                   VARCHAR(255)    NOT NULL,
  display_name            VARCHAR(200)    NULL,
  time_zone               VARCHAR(64)     NOT NULL DEFAULT 'UTC',
  last_login_at           DATETIME        NULL,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_users_clerk (clerk_user_id),
  UNIQUE KEY uq_crm_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_organization_members (
  organization_id         BIGINT          NOT NULL,
  user_id                 BIGINT          NOT NULL,
  role                    ENUM('super_admin','admin','marketing_manager','analyst','read_only') NOT NULL,
  invited_by              BIGINT          NULL,
  joined_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, user_id),
  KEY ix_crm_org_members_user (user_id),
  CONSTRAINT fk_crm_org_members_org  FOREIGN KEY (organization_id) REFERENCES crm_organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_crm_org_members_user FOREIGN KEY (user_id) REFERENCES crm_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_crm_org_members_inv  FOREIGN KEY (invited_by) REFERENCES crm_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_api_keys (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  key_prefix              VARCHAR(12)     NOT NULL COMMENT 'First 8 chars of the key for UI display',
  key_hash                VARCHAR(64)     NOT NULL COMMENT 'sha256 of the full key (never store plaintext)',
  name                    VARCHAR(100)    NOT NULL,
  scopes_json             JSON            NULL,
  last_used_at            DATETIME        NULL,
  revoked_at              DATETIME        NULL,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_api_keys_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_usage_meters (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  period_month            VARCHAR(7)      NOT NULL COMMENT 'YYYY-MM',
  metric                  ENUM('contacts','sends','sms') NOT NULL,
  value                   INT             NOT NULL DEFAULT 0,
  updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_usage_org_period_metric (organization_id, period_month, metric)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 2. Customers
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_customers (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  email                   VARCHAR(255)    NOT NULL,
  display_name            VARCHAR(200)    NULL,
  first_name              VARCHAR(100)    NULL,
  last_name               VARCHAR(100)    NULL,
  phone                   VARCHAR(32)     NULL,
  company                 VARCHAR(200)    NULL,
  is_vip                  TINYINT(1)      NOT NULL DEFAULT 0,
  is_subscribed           TINYINT(1)      NOT NULL DEFAULT 1,
  subscribed_at           DATETIME        NULL,
  unsubscribed_at         DATETIME        NULL,
  suppression_reason      ENUM('bounce','complaint','manual','unsubscribe') NULL,
  double_opt_in_at        DATETIME        NULL,
  consent_source          VARCHAR(100)    NULL,
  lifetime_spend          DECIMAL(12,2)   NOT NULL DEFAULT 0,
  order_count             INT             NOT NULL DEFAULT 0,
  refund_count            INT             NOT NULL DEFAULT 0,
  first_order_at          DATETIME        NULL,
  last_order_at           DATETIME        NULL,
  last_engagement_at      DATETIME        NULL,
  notes                   TEXT            NULL,
  source                  VARCHAR(64)     NULL,
  source_metadata_json    JSON            NULL,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_customers_org_email (organization_id, email),
  KEY ix_crm_customers_org_vip (organization_id, is_vip),
  KEY ix_crm_customers_org_subscribed (organization_id, is_subscribed),
  KEY ix_crm_customers_org_last_order (organization_id, last_order_at),
  KEY ix_crm_customers_org_last_eng (organization_id, last_engagement_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_customer_tags (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  name                    VARCHAR(64)     NOT NULL COMMENT 'Normalized: lowercase, dashed',
  color                   VARCHAR(16)     NULL,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_customer_tags_org_name (organization_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_customer_tag_links (
  customer_id             BIGINT          NOT NULL,
  tag_id                  BIGINT          NOT NULL,
  added_at                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, tag_id),
  KEY ix_crm_customer_tag_links_tag (tag_id),
  CONSTRAINT fk_crm_ctl_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_crm_ctl_tag      FOREIGN KEY (tag_id) REFERENCES crm_customer_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_customer_addresses (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  customer_id             BIGINT          NOT NULL,
  kind                    ENUM('shipping','billing','other') NOT NULL DEFAULT 'shipping',
  is_default              TINYINT(1)      NOT NULL DEFAULT 0,
  line1                   VARCHAR(200)    NULL,
  line2                   VARCHAR(200)    NULL,
  city                    VARCHAR(100)    NULL,
  state                   VARCHAR(100)    NULL,
  postal_code             VARCHAR(32)     NULL,
  country                 VARCHAR(2)      NULL COMMENT 'ISO 3166-1 alpha-2',
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_customer_addresses_customer (customer_id),
  CONSTRAINT fk_crm_ca_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_customer_aliases (
  organization_id         BIGINT          NOT NULL,
  alias_email             VARCHAR(255)    NOT NULL,
  canonical_email         VARCHAR(255)    NOT NULL,
  merged_at               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  merged_by               BIGINT          NULL,
  PRIMARY KEY (organization_id, alias_email),
  KEY ix_crm_customer_aliases_canonical (organization_id, canonical_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 3. Audience (lists + segments)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_lists (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  name                    VARCHAR(200)    NOT NULL,
  description             VARCHAR(500)    NULL,
  source                  VARCHAR(32)     NOT NULL DEFAULT 'manual' COMMENT 'manual / csv / form / api',
  archived                TINYINT(1)      NOT NULL DEFAULT 0,
  member_count            INT             NOT NULL DEFAULT 0,
  created_by              BIGINT          NULL,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_lists_org (organization_id, archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_list_members (
  list_id                 BIGINT          NOT NULL,
  customer_id             BIGINT          NOT NULL,
  added_at                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (list_id, customer_id),
  KEY ix_crm_list_members_customer (customer_id),
  CONSTRAINT fk_crm_lm_list     FOREIGN KEY (list_id) REFERENCES crm_lists(id) ON DELETE CASCADE,
  CONSTRAINT fk_crm_lm_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_segments (
  id                          BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id             BIGINT          NOT NULL,
  name                        VARCHAR(200)    NOT NULL,
  description                 VARCHAR(500)    NULL,
  rule_definition             JSON            NOT NULL COMMENT 'Nested AND/OR rule tree',
  member_count                INT             NOT NULL DEFAULT 0,
  last_refreshed_at           DATETIME        NULL,
  refresh_interval_seconds    INT             NOT NULL DEFAULT 300,
  archived                    TINYINT(1)      NOT NULL DEFAULT 0,
  created_by                  BIGINT          NULL,
  created_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_segments_org (organization_id, archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_segment_members (
  segment_id              BIGINT          NOT NULL,
  customer_id             BIGINT          NOT NULL,
  added_at                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (segment_id, customer_id),
  KEY ix_crm_segment_members_customer (customer_id),
  CONSTRAINT fk_crm_sm_segment  FOREIGN KEY (segment_id) REFERENCES crm_segments(id) ON DELETE CASCADE,
  CONSTRAINT fk_crm_sm_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 4. Email infrastructure
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_sending_domains (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  domain                  VARCHAR(255)    NOT NULL,
  status                  ENUM('pending','verified','failed','disabled') NOT NULL DEFAULT 'pending',
  dkim_records_json       JSON            NULL,
  dmarc_record            VARCHAR(500)    NULL,
  verified_at             DATETIME        NULL,
  last_checked_at         DATETIME        NULL,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_sending_domains_org_domain (organization_id, domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_senders (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  sending_domain_id       BIGINT          NULL,
  from_name               VARCHAR(100)    NOT NULL,
  from_email              VARCHAR(255)    NOT NULL,
  reply_to_email          VARCHAR(255)    NULL,
  is_default              TINYINT(1)      NOT NULL DEFAULT 0,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_senders_org (organization_id),
  CONSTRAINT fk_crm_senders_domain FOREIGN KEY (sending_domain_id) REFERENCES crm_sending_domains(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_templates (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  name                    VARCHAR(200)    NOT NULL,
  category                VARCHAR(64)     NULL,
  subject_default         VARCHAR(500)    NULL,
  design_json             JSON            NULL,
  html_body               LONGTEXT        NULL,
  text_body               TEXT            NULL,
  archived                TINYINT(1)      NOT NULL DEFAULT 0,
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_templates_org (organization_id, archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_suppressions (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  email                   VARCHAR(255)    NOT NULL,
  reason                  ENUM('bounce','complaint','manual','unsubscribe','spam_trap') NOT NULL,
  source                  VARCHAR(100)    NULL,
  suppressed_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_suppressions_org_email (organization_id, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 5. Campaigns + sending
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_campaigns (
  id                          BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id             BIGINT          NOT NULL,
  type                        ENUM('regular','automation','transactional') NOT NULL DEFAULT 'regular',
  name                        VARCHAR(200)    NOT NULL,
  subject                     VARCHAR(500)    NULL,
  preheader                   VARCHAR(500)    NULL,
  sender_id                   BIGINT          NULL,
  template_id                 BIGINT          NULL,
  audience_list_id            BIGINT          NULL,
  audience_segment_id         BIGINT          NULL,
  exclude_segment_id          BIGINT          NULL,
  status                      ENUM('draft','scheduled','sending','sent','failed','cancelled') NOT NULL DEFAULT 'draft',
  scheduled_at                DATETIME        NULL,
  sent_at                     DATETIME        NULL,
  recipients_count            INT             NOT NULL DEFAULT 0,
  delivered_count             INT             NOT NULL DEFAULT 0,
  opened_count                INT             NOT NULL DEFAULT 0,
  clicked_count               INT             NOT NULL DEFAULT 0,
  unsubscribed_count          INT             NOT NULL DEFAULT 0,
  bounced_count               INT             NOT NULL DEFAULT 0,
  complained_count            INT             NOT NULL DEFAULT 0,
  revenue_attributed_usd      DECIMAL(12,2)   NOT NULL DEFAULT 0,
  created_by                  BIGINT          NULL,
  created_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_campaigns_org_status (organization_id, status),
  KEY ix_crm_campaigns_org_sent_at (organization_id, sent_at),
  CONSTRAINT fk_crm_campaigns_sender   FOREIGN KEY (sender_id) REFERENCES crm_senders(id) ON DELETE SET NULL,
  CONSTRAINT fk_crm_campaigns_template FOREIGN KEY (template_id) REFERENCES crm_templates(id) ON DELETE SET NULL,
  CONSTRAINT fk_crm_campaigns_list     FOREIGN KEY (audience_list_id) REFERENCES crm_lists(id) ON DELETE SET NULL,
  CONSTRAINT fk_crm_campaigns_segment  FOREIGN KEY (audience_segment_id) REFERENCES crm_segments(id) ON DELETE SET NULL,
  CONSTRAINT fk_crm_campaigns_exclude  FOREIGN KEY (exclude_segment_id) REFERENCES crm_segments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_emails (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  campaign_id             BIGINT          NOT NULL,
  customer_id             BIGINT          NOT NULL,
  message_id              VARCHAR(200)    NULL COMMENT 'ESP message id',
  status                  ENUM('queued','sent','delivered','opened','clicked','bounced','complained','unsubscribed','failed') NOT NULL DEFAULT 'queued',
  sent_at                 DATETIME        NULL,
  delivered_at            DATETIME        NULL,
  first_opened_at         DATETIME        NULL,
  first_clicked_at        DATETIME        NULL,
  bounced_at              DATETIME        NULL,
  unsubscribed_at         DATETIME        NULL,
  open_count              INT             NOT NULL DEFAULT 0,
  click_count             INT             NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_emails_campaign_customer (campaign_id, customer_id),
  KEY ix_crm_emails_campaign (campaign_id),
  KEY ix_crm_emails_customer (customer_id),
  KEY ix_crm_emails_org_status (organization_id, status),
  CONSTRAINT fk_crm_emails_campaign FOREIGN KEY (campaign_id) REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_crm_emails_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_email_events (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  email_id                BIGINT          NOT NULL,
  type                    ENUM('sent','delivered','open','click','bounce','complaint','unsubscribe') NOT NULL,
  occurred_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json           JSON            NULL,
  ip_address              VARCHAR(64)     NULL,
  user_agent              VARCHAR(500)    NULL,
  PRIMARY KEY (id),
  KEY ix_crm_email_events_email (email_id, type),
  KEY ix_crm_email_events_org_type (organization_id, type, occurred_at),
  CONSTRAINT fk_crm_email_events_email FOREIGN KEY (email_id) REFERENCES crm_emails(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 6. Automations
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_automations (
  id                          BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id             BIGINT          NOT NULL,
  name                        VARCHAR(200)    NOT NULL,
  description                 VARCHAR(500)    NULL,
  trigger_type                ENUM('contact_added','form_submitted','product_viewed','added_to_cart','checkout_started','purchase_completed','birthday','custom_event') NOT NULL,
  trigger_config_json         JSON            NULL,
  status                      ENUM('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
  reentry_policy              ENUM('once','always','after_completion') NOT NULL DEFAULT 'once',
  enrolled_count              INT             NOT NULL DEFAULT 0,
  completed_count             INT             NOT NULL DEFAULT 0,
  conversion_count            INT             NOT NULL DEFAULT 0,
  created_by                  BIGINT          NULL,
  created_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_automations_org_status (organization_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_automation_steps (
  id                          BIGINT          NOT NULL AUTO_INCREMENT,
  automation_id               BIGINT          NOT NULL,
  parent_step_id              BIGINT          NULL,
  branch                      VARCHAR(16)     NULL COMMENT '"yes" / "no" for steps emerging from a condition',
  order_index                 INT             NOT NULL DEFAULT 0,
  type                        ENUM('action','delay','condition','end') NOT NULL,
  config_json                 JSON            NOT NULL,
  PRIMARY KEY (id),
  KEY ix_crm_automation_steps_automation (automation_id),
  CONSTRAINT fk_crm_as_automation FOREIGN KEY (automation_id) REFERENCES crm_automations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_automation_runs (
  id                          BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id             BIGINT          NOT NULL,
  automation_id               BIGINT          NOT NULL,
  customer_id                 BIGINT          NOT NULL,
  current_step_id             BIGINT          NULL,
  status                      ENUM('active','waiting','completed','exited','errored') NOT NULL DEFAULT 'active',
  enrolled_at                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_advanced_at            DATETIME        NULL,
  waiting_until               DATETIME        NULL COMMENT 'When delay-node runs should advance',
  completed_at                DATETIME        NULL,
  exit_reason                 VARCHAR(100)    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_runs_auto_cust_active (automation_id, customer_id, status),
  KEY ix_crm_runs_waiting (status, waiting_until),
  CONSTRAINT fk_crm_runs_auto FOREIGN KEY (automation_id) REFERENCES crm_automations(id) ON DELETE CASCADE,
  CONSTRAINT fk_crm_runs_cust FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_crm_runs_step FOREIGN KEY (current_step_id) REFERENCES crm_automation_steps(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 7. Forms
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_forms (
  id                          BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id             BIGINT          NOT NULL,
  slug                        VARCHAR(64)     NOT NULL COMMENT 'Public hosted URL slug',
  name                        VARCHAR(200)    NOT NULL,
  type                        ENUM('popup','embed','slide_in','full_screen','hosted') NOT NULL DEFAULT 'embed',
  fields_json                 JSON            NOT NULL,
  design_json                 JSON            NULL,
  targeting_json              JSON            NULL,
  success_behavior_json       JSON            NULL,
  target_list_id              BIGINT          NULL,
  status                      ENUM('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
  impressions                 INT             NOT NULL DEFAULT 0,
  submissions                 INT             NOT NULL DEFAULT 0,
  created_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_crm_forms_org_slug (organization_id, slug),
  KEY ix_crm_forms_org_status (organization_id, status),
  CONSTRAINT fk_crm_forms_list FOREIGN KEY (target_list_id) REFERENCES crm_lists(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_form_submissions (
  id                      BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id         BIGINT          NOT NULL,
  form_id                 BIGINT          NOT NULL,
  customer_id             BIGINT          NULL,
  data_json               JSON            NOT NULL,
  source_url              VARCHAR(500)    NULL,
  ip_address              VARCHAR(64)     NULL,
  user_agent              VARCHAR(500)    NULL,
  submitted_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_form_submissions_form (form_id, submitted_at),
  CONSTRAINT fk_crm_fs_form     FOREIGN KEY (form_id) REFERENCES crm_forms(id) ON DELETE CASCADE,
  CONSTRAINT fk_crm_fs_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 8. Integrations + webhooks + audit
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS crm_integrations (
  id                          BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id             BIGINT          NOT NULL,
  type                        ENUM('shopify','woocommerce','bigcommerce','amazon','ebay','veeqo','stripe','sendgrid','resend','ses','twilio') NOT NULL,
  name                        VARCHAR(200)    NOT NULL,
  config_json                 JSON            NULL,
  credentials_encrypted       TEXT            NULL COMMENT 'Encrypted at rest. Never log.',
  status                      ENUM('connected','syncing','error','disconnected') NOT NULL DEFAULT 'connected',
  last_sync_at                DATETIME        NULL,
  last_error_message          VARCHAR(500)    NULL,
  created_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_integrations_org_type (organization_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_webhooks (
  id                          BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id             BIGINT          NOT NULL,
  url                         VARCHAR(500)    NOT NULL,
  secret                      VARCHAR(100)    NOT NULL COMMENT 'HMAC signing secret',
  events_subscribed_json      JSON            NOT NULL,
  status                      ENUM('active','paused','failing') NOT NULL DEFAULT 'active',
  last_delivery_at            DATETIME        NULL,
  failure_count               INT             NOT NULL DEFAULT 0,
  created_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_webhooks_org (organization_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_audit_logs (
  id                          BIGINT          NOT NULL AUTO_INCREMENT,
  organization_id             BIGINT          NOT NULL,
  user_id                     BIGINT          NULL,
  action                      VARCHAR(64)     NOT NULL COMMENT 'e.g. customer.tag_added',
  target_type                 VARCHAR(32)     NULL COMMENT 'e.g. customer, segment, campaign',
  target_id                   BIGINT          NULL,
  metadata_json               JSON            NULL,
  ip_address                  VARCHAR(64)     NULL,
  occurred_at                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_crm_audit_logs_org_time (organization_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- Verification — list created tables
-- ==========================================================================
SELECT TABLE_NAME, TABLE_ROWS
  FROM INFORMATION_SCHEMA.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME LIKE 'crm_%'
 ORDER BY TABLE_NAME;
