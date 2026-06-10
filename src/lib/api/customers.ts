import { cookies } from "next/headers";

/**
 * crm-api client for customers (server-only).
 * Reads from the .NET backend instead of the DB directly. Forwards the
 * caller's session cookie so crm-api can authenticate + org-scope.
 */
const API_BASE = process.env.NETX_API_BASE_URL;

export type ApiCustomer = {
  id: number;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  isVip: boolean;
  isSubscribed: boolean;
  lifetimeSpend: number;
  orderCount: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  lastEngagementAt: string | null;
  createdAt: string;
  channels: string[];
};

export type CustomersPage = { rows: ApiCustomer[]; total: number; page: number; pageSize: number };

/** GET crm-api /api/customers — { rows, total, page, pageSize }. Returns empty on no-config/401/error. */
export async function fetchCustomers(
  opts: { q?: string; page?: number; pageSize?: number; filter?: string } = {},
): Promise<CustomersPage> {
  const { q = "", page = 1, pageSize = 50, filter = "" } = opts;
  const empty: CustomersPage = { rows: [], total: 0, page, pageSize };
  if (!API_BASE) return empty;

  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (filter) sp.set("filter", filter);
  sp.set("page", String(page));
  sp.set("pageSize", String(pageSize));

  try {
    const cookie = (await cookies()).toString();
    const res = await fetch(`${API_BASE}/customers?${sp.toString()}`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return empty; // 401 (no session), etc.
    return (await res.json()) as CustomersPage;
  } catch {
    return empty;
  }
}
