export type CustomerChannel = "shopify" | "woo" | "pos" | "direct";
export type CustomerFlag = "vip" | "at_risk" | "new" | "has_refund" | "subscribed" | "unsubscribed";

export interface Customer {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  channels: CustomerChannel[];
  lifetimeSpend: number;
  orderCount: number;
  firstOrderAt?: Date;
  lastOrderAt?: Date;
  lastEngagementAt?: Date;
  refundCount: number;
  isVip: boolean;
  isSubscribed: boolean;
  tags: string[];
  notes?: string;
}

export interface CustomerSummary extends Pick<Customer, "id" | "email" | "displayName" | "channels" | "lifetimeSpend" | "orderCount" | "lastOrderAt" | "lastEngagementAt" | "isVip" | "tags"> {
  daysSinceLastOrder: number;
  flags: CustomerFlag[];
}
