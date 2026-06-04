import type { CustomerSummary } from "@/types/customer";

const now = Date.now();
const days = (n: number) => new Date(now - n * 86_400_000);

export const mockCustomers: CustomerSummary[] = [
  {
    id: "cus_1", email: "sarah.c@gmail.com", displayName: "Sarah Chen",
    channels: ["shopify"], lifetimeSpend: 2140.5, orderCount: 14,
    lastOrderAt: days(2), lastEngagementAt: days(0), daysSinceLastOrder: 2,
    isVip: true, tags: ["VIP", "linen-lover", "SF"], flags: ["vip", "subscribed"],
  },
  {
    id: "cus_2", email: "marcus@okafor.dev", displayName: "Marcus Okafor",
    channels: ["shopify"], lifetimeSpend: 840.2, orderCount: 6,
    lastOrderAt: days(12), lastEngagementAt: days(1), daysSinceLastOrder: 12,
    isVip: false, tags: ["wholesale"], flags: ["subscribed"],
  },
  {
    id: "cus_3", email: "emily.tan@outlook.com", displayName: "Emily Tan",
    channels: ["shopify"], lifetimeSpend: 2890, orderCount: 21,
    lastOrderAt: days(5), lastEngagementAt: days(3), daysSinceLastOrder: 5,
    isVip: true, tags: ["VIP"], flags: ["vip", "subscribed"],
  },
  {
    id: "cus_4", email: "dkim@kimcorp.com", displayName: "David Kim",
    channels: ["shopify"], lifetimeSpend: 120, orderCount: 2,
    lastOrderAt: days(120), lastEngagementAt: days(95), daysSinceLastOrder: 120,
    isVip: false, tags: [], flags: ["at_risk", "subscribed"],
  },
  {
    id: "cus_5", email: "priya.s@example.com", displayName: "Priya Sharma",
    channels: ["pos"], lifetimeSpend: 340.1, orderCount: 3,
    lastOrderAt: days(22), lastEngagementAt: days(22), daysSinceLastOrder: 22,
    isVip: false, tags: [], flags: ["new", "subscribed"],
  },
  {
    id: "cus_6", email: "jordan.lee@protonmail.com", displayName: "Jordan Lee",
    channels: ["shopify", "pos"], lifetimeSpend: 612, orderCount: 5,
    lastOrderAt: days(8), lastEngagementAt: days(4), daysSinceLastOrder: 8,
    isVip: false, tags: ["repeat"], flags: ["subscribed"],
  },
  {
    id: "cus_7", email: "alex.romero@me.com", displayName: "Alex Romero",
    channels: ["shopify"], lifetimeSpend: 580, orderCount: 4,
    lastOrderAt: days(18), lastEngagementAt: days(10), daysSinceLastOrder: 18,
    isVip: false, tags: [], flags: ["subscribed"],
  },
  {
    id: "cus_8", email: "katie.zhou@gmail.com", displayName: "Katie Zhou",
    channels: ["shopify"], lifetimeSpend: 1840, orderCount: 11,
    lastOrderAt: days(3), lastEngagementAt: days(1), daysSinceLastOrder: 3,
    isVip: true, tags: ["VIP", "early-bird"], flags: ["vip", "subscribed"],
  },
  {
    id: "cus_9", email: "ben.martin@example.com", displayName: "Ben Martin",
    channels: ["shopify"], lifetimeSpend: 78, orderCount: 1,
    lastOrderAt: days(180), lastEngagementAt: days(45), daysSinceLastOrder: 180,
    isVip: false, tags: ["refund-issued"], flags: ["at_risk", "has_refund"],
  },
  {
    id: "cus_10", email: "tess.nguyen@outlook.com", displayName: "Tess Nguyen",
    channels: ["shopify"], lifetimeSpend: 1220, orderCount: 9,
    lastOrderAt: days(6), lastEngagementAt: days(0), daysSinceLastOrder: 6,
    isVip: false, tags: ["repeat"], flags: ["subscribed"],
  },
];

export const mockSummary = {
  total: 2431,
  vip: 84,
  atRisk: 312,
  newLast30: 91,
  hasRefund: 28,
  subscribed: 1827,
  unsubscribed: 604,
};
