-- ==========================================================================
-- Baseline seed data
-- ==========================================================================
-- Apply with:    mysql -h <host> -u <user> -p omnc < 0003_seed_baseline.sql
-- Idempotent:    Yes (INSERT IGNORE / ON DUPLICATE KEY UPDATE)
-- Coordinates:   Run AFTER 0001 (creates the tables) and 0002 (retrofits NetX).
--
-- What this seeds:
--   - The 4 plan tiers (Free, Starter, Growth, Enterprise) into crm_plans
--   - The internal organization (id = 1) into crm_organizations
-- ==========================================================================

SET NAMES utf8mb4;

-- --------------------------------------------------------------------------
-- 1. Plans
-- --------------------------------------------------------------------------
INSERT INTO crm_plans (slug, name, contacts_limit, sends_per_month_limit, price_monthly_usd, features_json, active)
VALUES
  ('free',
   'Free',
   250, 500, 0.00,
   JSON_OBJECT(
     'segments_max', 3,
     'automations_max', 1,
     'team_seats', 1,
     'support', 'community',
     'dedicated_ip', false
   ),
   1),
  ('starter',
   'Starter',
   2500, 25000, 29.00,
   JSON_OBJECT(
     'segments_max', 20,
     'automations_max', 10,
     'team_seats', 3,
     'support', 'email',
     'dedicated_ip', false
   ),
   1),
  ('growth',
   'Growth',
   25000, 250000, 149.00,
   JSON_OBJECT(
     'segments_max', null,
     'automations_max', null,
     'team_seats', 10,
     'support', 'priority',
     'dedicated_ip', false
   ),
   1),
  ('enterprise',
   'Enterprise',
   1000000, 5000000, 0.00,
   JSON_OBJECT(
     'segments_max', null,
     'automations_max', null,
     'team_seats', null,
     'support', 'dedicated',
     'dedicated_ip', true,
     'custom_pricing', true
   ),
   1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  contacts_limit = VALUES(contacts_limit),
  sends_per_month_limit = VALUES(sends_per_month_limit),
  price_monthly_usd = VALUES(price_monthly_usd),
  features_json = VALUES(features_json),
  active = VALUES(active);

-- --------------------------------------------------------------------------
-- 2. The internal organization (id = 1)
-- --------------------------------------------------------------------------
-- We pin id = 1 explicitly so the org_id retrofit in 0002 aligns with this row.

INSERT INTO crm_organizations (
  id, slug, name, plan_id, status, billing_email, trial_ends_at
)
SELECT 1, 'internal', 'Internal Store',
       (SELECT id FROM crm_plans WHERE slug = 'enterprise'),
       'active', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM crm_organizations WHERE id = 1);

-- If the row exists but plan_id is null, link it to enterprise.
UPDATE crm_organizations
   SET plan_id = (SELECT id FROM crm_plans WHERE slug = 'enterprise')
 WHERE id = 1 AND plan_id IS NULL;

-- --------------------------------------------------------------------------
-- 3. Verification
-- --------------------------------------------------------------------------
SELECT id, slug, name, status, plan_id, created_at
  FROM crm_organizations
 WHERE id = 1;

SELECT slug, name, contacts_limit, sends_per_month_limit, price_monthly_usd, active
  FROM crm_plans
 ORDER BY price_monthly_usd;
