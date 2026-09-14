import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/session";

// Proxies every /api/* call the browser makes straight through to the
// FastAPI backend on Render. This is what keeps the session cookie working
// without CORS or cross-site-cookie headaches: the browser only ever talks
// to this Next.js app's own origin, so FastAPI's Set-Cookie response gets
// applied to that same first-party origin, not Render's.

export const dynamic = "force-dynamic";

// Headers that must not be forwarded verbatim in either direction (either
// they're connection-specific, or forwarding the original would corrupt the
// proxied request/response -- e.g. a stale content-length after headers
// are re-serialized).
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function handle(req: NextRequest, path: string[]): Promise<NextResponse> {
  const target = new URL(`${BACKEND_URL}/api/${path.join("/")}${req.nextUrl.search}`);

  const requestHeaders = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) requestHeaders.set(key, value);
  });

  const hasBody = !["GET", "HEAD"].includes(req.method);

  let backendRes: Response;
  try {
    backendRes = await fetch(target, {
      method: req.method,
      headers: requestHeaders,
      body: hasBody ? req.body : undefined,
      redirect: "manual",
      cache: "no-store",
      // Required by undici when streaming a request body through fetch.
      // @ts-expect-error -- `duplex` isn't in the standard RequestInit type yet.
      duplex: hasBody ? "half" : undefined,
    });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }

  const responseHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "set-cookie") {
      responseHeaders.set(key, value);
    }
  });
  // Headers.get("set-cookie") collapses multiple cookies into one string;
  // getSetCookie() preserves them as separate entries, which is what a
  // multi-cookie response (rare here, but future-proof) needs.
  for (const cookie of backendRes.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(backendRes.body, {
    status: backendRes.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return handle(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return handle(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handle(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return handle(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return handle(req, (await ctx.params).path);
}
