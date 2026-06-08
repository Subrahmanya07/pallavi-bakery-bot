import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildTargetUrl, getBackendBaseUrls, isPathSafe } from "./backend";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

/**
 * This route relays requests to the protected backend /admin/* API. Without
 * verifying the caller's own key, it would act as an open relay — granting
 * anyone who can reach this URL full admin access regardless of the dashboard
 * login screen. The caller must present the same key configured server-side.
 */
function callerIsAuthorized(request: NextRequest): boolean {
  const provided = request.headers.get("x-admin-key");
  if (!provided || !ADMIN_API_KEY) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(ADMIN_API_KEY);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function proxy(request: NextRequest, path: string[]) {
  if (!ADMIN_API_KEY) {
    return NextResponse.json(
      { detail: "Admin API key is not configured on the dashboard server" },
      { status: 500 },
    );
  }

  if (!callerIsAuthorized(request)) {
    return NextResponse.json({ detail: "Invalid admin key" }, { status: 403 });
  }

  if (!isPathSafe(path)) {
    return NextResponse.json({ detail: "Invalid path" }, { status: 400 });
  }

  const headers = new Headers();
  headers.set("X-Admin-Key", ADMIN_API_KEY);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const candidates = getBackendBaseUrls();
  let lastError: unknown = null;

  for (const baseUrl of candidates) {
    try {
      const upstream = await fetch(buildTargetUrl(baseUrl, path, request.nextUrl.search), init);
      const text = await upstream.text();

      return new NextResponse(text, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        },
      });
    } catch (error) {
      lastError = error;
    }
  }

  const detail = lastError instanceof Error ? lastError.message : "Unknown upstream error";
  return NextResponse.json(
    {
      detail: `Could not reach admin backend. Tried: ${candidates.join(", ")}`,
      cause: detail,
    },
    { status: 502 },
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}
