-- 0004: add primary_channel to crm_customers and backfill from netx_orders.
-- Additive, non-destructive. crm_customers is CRM-owned. Back up before running.

ALTER TABLE crm_customers ADD COLUMN primary_channel VARCHAR(64) NULL;

-- Backfill each customer's most-frequent store/channel (real marketplace_name),
-- matched to orders by email.
UPDATE crm_customers cc
JOIN (
  SELECT customer_email,
    SUBSTRING_INDEX(
      GROUP_CONCAT(rawchan ORDER BY cnt DESC SEPARATOR '||'), '||', 1) AS topchan
  FROM (
    SELECT customer_email,
           COALESCE(NULLIF(marketplace_name, ''), channel, marketplace_type, 'unknown') AS rawchan,
           COUNT(*) AS cnt
    FROM netx_orders
    WHERE customer_email IS NOT NULL AND customer_email <> ''
    GROUP BY customer_email, rawchan
  ) x
  GROUP BY customer_email
) o ON o.customer_email = cc.email
SET cc.primary_channel = o.topchan
WHERE cc.organization_id = 1;
