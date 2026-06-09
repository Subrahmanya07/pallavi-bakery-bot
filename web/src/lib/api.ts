"use client";

import { getAdminKey, clearAdminKey } from "./auth";

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  is_available: boolean;
  image_url?: string | null;
  customizations: string[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  customization?: string | null;
}

export interface StatusHistory {
  status: string;
  changed_at: string;
  changed_by: string;
}

export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export interface Order {
  id: string;
  order_number: string;
  telegram_user_id: number;
  customer_name: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  payment_status: PaymentStatus;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  pickup_time?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  status_history: StatusHistory[];
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "PICKED_UP"
  | "CANCELLED";

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "PICKED_UP",
  "CANCELLED",
];

const BASE_URL = "/api";

// The backend stores Mongo documents with `_id`. Normalise to `id`.
function withId<T extends { _id?: string; id?: string }>(doc: T): T & { id: string } {
  const { _id, ...rest } = doc as Record<string, unknown> & { _id?: string };
  return { ...(rest as T), id: (doc.id ?? _id ?? "") as string };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = getAdminKey();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "X-Admin-Key": key } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    clearAdminKey();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error(`${res.status}: Not authorized`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  // DELETE / some PATCH may return empty body
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

/* ---------------- Orders ---------------- */

export async function getOrders(status?: string): Promise<Order[]> {
  const qs = status ? `?status=${status}` : "";
  const data = await request<{ orders: Order[] }>(`/admin/orders${qs}`);
  return (data.orders ?? []).map(withId);
}

export async function getOrder(orderId: string): Promise<Order> {
  const data = await request<Order>(`/admin/orders/${orderId}`);
  return withId(data);
}

export interface StatusUpdateResult {
  ok: boolean;
  order_number: string;
  status: string;
  customer_notified: boolean;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<StatusUpdateResult> {
  return request<StatusUpdateResult>(`/admin/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/* ---------------- Menu ---------------- */

export async function getMenuItems(): Promise<MenuItem[]> {
  const data = await request<{ items: MenuItem[] }>("/admin/menu");
  return (data.items ?? []).map(withId);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface MenuItemInput {
  name: string;
  category: string;
  description: string;
  price: number;
  is_available: boolean;
  customizations: string[];
}

export async function createMenuItem(
  data: MenuItemInput
): Promise<{ ok: boolean; id: string }> {
  const body = { ...data, slug: slugify(data.name) };
  return request<{ ok: boolean; id: string }>("/admin/menu", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateMenuItem(
  itemId: string,
  data: Partial<MenuItemInput>
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/menu/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteMenuItem(itemId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/menu/${itemId}`, { method: "DELETE" });
}
