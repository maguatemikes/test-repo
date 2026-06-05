-- ==========================================================================
-- NetX tables — multi-tenant retrofit
-- ==========================================================================
-- Apply with:    mysql -h <host> -u <user> -p omnc < 0002_netx_org_id_retrofit.sql
-- Idempotent:    Yes (INFORMATION_SCHEMA-guarded — same pattern NetX uses)
-- Coordinates:   YES — coordinate with NetX desktop releases before applying.
--                The desktop client needs to be updated to read org_id (default = 1).
--
-- What this does:
--   Adds `organization_id BIGINT NOT NULL DEFAULT 1` to every NetX customer-touching
--   table. Backfills existing rows with org_id = 1 (the internal store). Adds an
--   index on (organization_id, ...).
--
-- Why DEFAULT 1:
--   So existing NetX desktop code that doesn't yet know about org_id keeps working —
--   any new INSERT without org_id falls into the internal store. Remove DEFAULT in
--   a Phase 2 migration once NetX desktop reads org_id explicitly.
-- ==========================================================================

SET NAMES utf8mb4;

-- --------------------------------------------------------------------------
-- Helper: macro to add organization_id to a NetX table if not present
-- --------------------------------------------------------------------------
-- This pattern matches netx_updater_v1_schema.sql for consistency.

-- 1. netx_orders
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'netx_orders' AND COLUMN_NAME = 'organization_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE netx_orders ADD COLUMN organization_id BIGINT NOT NULL DEFAULT 1 COMMENT ''Tenant scope; 1 = internal store.''',
  'SELECT ''netx_orders.organization_id exists'' AS note');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'netx_orders' AND INDEX_NAME = 'ix_netx_orders_org');
SET @ddl := IF(@idx = 0,
  'CREATE INDEX ix_netx_orders_org ON netx_orders (organization_id, order_date)',
  'SELECT ''ix_netx_orders_org exists'' AS note');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 2. netx_customer_meta
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'netx_customer_meta' AND COLUMN_NAME = 'organization_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE netx_customer_meta ADD COLUMN organization_id BIGINT NOT NULL DEFAULT 1',
  'SELECT ''netx_customer_meta.organization_id exists'' AS note');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'netx_customer_meta' AND INDEX_NAME = 'ix_netx_customer_meta_org');
SET @ddl := IF(@idx = 0,
  'CREATE INDEX ix_netx_customer_meta_org ON netx_customer_meta (organization_id, email)',
  'SELECT ''ix_netx_customer_meta_org exists'' AS note');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 3. netx_customer_meta_history
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'netx_customer_meta_history' AND COLUMN_NAME = 'organization_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE netx_customer_meta_history ADD COLUMN organization_id BIGINT NOT NULL DEFAULT 1',
  'SELECT ''netx_customer_meta_history.organization_id exists'' AS note');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 4. netx_customer_alias
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'netx_customer_alias' AND COLUMN_NAME = 'organization_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE netx_customer_alias ADD COLUMN organization_id BIGINT NOT NULL DEFAULT 1',
  'SELECT ''netx_customer_alias.organization_id exists'' AS note');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 5. netx_marketplaces
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'netx_marketplaces' AND COLUMN_NAME = 'organization_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE netx_marketplaces ADD COLUMN organization_id BIGINT NOT NULL DEFAULT 1',
  'SELECT ''netx_marketplaces.organization_id exists OR table missing'' AS note');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 6. netx_marketplace_content
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'netx_marketplace_content' AND COLUMN_NAME = 'organization_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE netx_marketplace_content ADD COLUMN organization_id BIGINT NOT NULL DEFAULT 1',
  'SELECT ''netx_marketplace_content.organization_id exists OR table missing'' AS note');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 7. netx_video_calls
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'netx_video_calls' AND COLUMN_NAME = 'organization_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE netx_video_calls ADD COLUMN organization_id BIGINT NOT NULL DEFAULT 1',
  'SELECT ''netx_video_calls.organization_id exists OR table missing'' AS note');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 8. netx_video_operators
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'netx_video_operators' AND COLUMN_NAME = 'organization_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE netx_video_operators ADD COLUMN organization_id BIGINT NOT NULL DEFAULT 1',
  'SELECT ''netx_video_operators.organization_id exists OR table missing'' AS note');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- --------------------------------------------------------------------------
-- Backfill verification — every row should have organization_id populated
-- --------------------------------------------------------------------------
-- Because of DEFAULT 1, all existing rows already have organization_id = 1.
-- This block confirms no NULLs slipped through.

SELECT 'netx_orders' AS table_name,
       COUNT(*) AS total_rows,
       SUM(CASE WHEN organization_id IS NULL THEN 1 ELSE 0 END) AS null_org_id,
       SUM(CASE WHEN organization_id = 1 THEN 1 ELSE 0 END) AS internal_store_rows
  FROM netx_orders
UNION ALL
SELECT 'netx_customer_meta',
       COUNT(*),
       SUM(CASE WHEN organization_id IS NULL THEN 1 ELSE 0 END),
       SUM(CASE WHEN organization_id = 1 THEN 1 ELSE 0 END)
  FROM netx_customer_meta
UNION ALL
SELECT 'netx_customer_meta_history',
       COUNT(*),
       SUM(CASE WHEN organization_id IS NULL THEN 1 ELSE 0 END),
       SUM(CASE WHEN organization_id = 1 THEN 1 ELSE 0 END)
  FROM netx_customer_meta_history
UNION ALL
SELECT 'netx_customer_alias',
       COUNT(*),
       SUM(CASE WHEN organization_id IS NULL THEN 1 ELSE 0 END),
       SUM(CASE WHEN organization_id = 1 THEN 1 ELSE 0 END)
  FROM netx_customer_alias;

-- ==========================================================================
-- Phase 2 follow-up (do NOT run yet):
-- ==========================================================================
-- Once NetX desktop has been updated to explicitly pass organization_id on every
-- INSERT, remove the DEFAULT to enforce explicit tenancy:
--
--   ALTER TABLE netx_orders               MODIFY organization_id BIGINT NOT NULL;
--   ALTER TABLE netx_customer_meta        MODIFY organization_id BIGINT NOT NULL;
--   ALTER TABLE netx_customer_meta_history MODIFY organization_id BIGINT NOT NULL;
--   ALTER TABLE netx_customer_alias       MODIFY organization_id BIGINT NOT NULL;
--   ALTER TABLE netx_marketplaces         MODIFY organization_id BIGINT NOT NULL;
--   ALTER TABLE netx_marketplace_content  MODIFY organization_id BIGINT NOT NULL;
--   ALTER TABLE netx_video_calls          MODIFY organization_id BIGINT NOT NULL;
--   ALTER TABLE netx_video_operators      MODIFY organization_id BIGINT NOT NULL;
--
-- Also add FK constraints to organizations(id) at that point.
