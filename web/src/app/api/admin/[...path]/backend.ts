const DEFAULT_LOCAL_BACKEND_URLS = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
];

export function getBackendBaseUrls() {
  const explicit = process.env.ADMIN_API_URL?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  const candidates = explicit
    ? [explicit, ...DEFAULT_LOCAL_BACKEND_URLS, publicUrl]
    : [...DEFAULT_LOCAL_BACKEND_URLS, publicUrl];

  return candidates.filter((value, index, array): value is string => {
    return Boolean(value) && array.indexOf(value) === index;
  });
}

/** Rejects traversal/empty segments so the relayed request can't escape /admin/*. */
export function isPathSafe(path: string[]): boolean {
  return path.every(segment => segment !== ".." && segment !== "." && segment !== "");
}

export function buildTargetUrl(baseUrl: string, path: string[], search: string): string {
  const target = new URL(`/admin/${path.join("/")}`, baseUrl);
  if (target.pathname !== "/admin" && !target.pathname.startsWith("/admin/")) {
    throw new Error("Resolved path escapes /admin/*");
  }
  target.search = search;
  return target.toString();
}
