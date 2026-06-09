import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (
  process.env.ADMIN_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/$/, "");

function buildUrl(path: string[], search: string): string {
  const url = new URL(`/payment/${path.join("/")}`, BACKEND_URL);
  url.search = search;
  return url.toString();
}

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const url = buildUrl(path, request.nextUrl.search);
  const headers = new Headers({ "content-type": "application/json" });

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const res = await fetch(url, init);
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
