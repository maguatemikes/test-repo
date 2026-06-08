-- 0006: seed the preset segments into crm_segments (definitions only).
-- Idempotent-ish: run once. Membership stays on-the-fly (crm_segment_members NOT populated).
-- rule_definition is evaluated live against crm_customers.

INSERT INTO crm_segments (organization_id, name, description, rule_definition) VALUES
(1, 'High-value recent buyers', 'Total Revenue > $500 AND Last Order within 30 days',
 '{"op":"AND","rules":[{"field":"lifetime_spend","op":"gt","value":500},{"field":"last_order_at","op":"within_days","value":30}]}'),
(1, 'At-risk customers', 'Has placed at least 1 order AND last order > 45 days ago',
 '{"op":"AND","rules":[{"field":"order_count","op":"gte","value":1},{"field":"last_order_at","op":"older_than_days","value":45}]}'),
(1, 'VIP or high LTV', 'Customer Lifetime Value >= $1,000',
 '{"op":"AND","rules":[{"field":"lifetime_spend","op":"gte","value":1000}]}'),
(1, 'New subscribers — last 7 days', 'Contact created within 7 days AND Source is Form',
 '{"op":"AND","rules":[{"field":"created_at","op":"within_days","value":7},{"field":"source","op":"eq","value":"form"}]}'),
(1, 'Shopify buyers', 'Source is Shopify',
 '{"op":"AND","rules":[{"field":"source","op":"eq","value":"shopify"}]}'),
(1, 'Repeat buyers (3+ orders)', 'Total orders > 2',
 '{"op":"AND","rules":[{"field":"order_count","op":"gt","value":2}]}');
