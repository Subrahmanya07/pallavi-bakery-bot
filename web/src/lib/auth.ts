"use client";

const STORAGE_KEY = "bakery_admin_key";

export function getAdminKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(STORAGE_KEY);
}

export function setAdminKey(key: string): void {
  window.sessionStorage.setItem(STORAGE_KEY, key);
}

export function clearAdminKey(): void {
  window.sessionStorage.removeItem(STORAGE_KEY);
}

/** Verifies a candidate key against the backend by calling an authenticated endpoint. */
export async function verifyAdminKey(key: string): Promise<boolean> {
  const res = await fetch("/api/admin/menu", {
    headers: { "X-Admin-Key": key },
    cache: "no-store",
  });
  return res.ok;
}
