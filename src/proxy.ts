import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// In-memory cache for IP rate limiting (resilient to edge environment)
const ipCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60; // Max 60 requests per minute
const WINDOW_MS = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Inline periodic cleanup (1% chance per request to prevent cache accumulation)
  if (Math.random() < 0.01) {
    for (const [cachedIp, record] of ipCache.entries()) {
      if (now > record.resetTime) {
        ipCache.delete(cachedIp);
      }
    }
  }

  const record = ipCache.get(ip);

  if (!record) {
    ipCache.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }

  if (now > record.resetTime) {
    ipCache.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }

  record.count++;
  if (record.count > RATE_LIMIT) {
    return true;
  }

  return false;
}

export default withAuth(
  function proxy(req) {
    const ip = (req as unknown as { ip?: string }).ip || req.headers.get("x-forwarded-for") || "127.0.0.1";
    const pathname = req.nextUrl.pathname;

    // 1. Rate Limiting for Auth/User and API endpoints
    const isApiOrAuth =
      pathname.startsWith("/api/") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup");

    if (isApiOrAuth && isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      );
    }

    // 2. Authentication Route Guards
    const token = req.nextauth.token;
    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

    let response = NextResponse.next();

    if (isAuthPage) {
      if (token) {
        response = NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } else if (!token && pathname.startsWith("/dashboard")) {
      response = NextResponse.redirect(new URL("/login", req.url));
    }

    // 3. Inject Security Headers
    const isDev = process.env.NODE_ENV === "development";

    // PPR-compatible Content Security Policy (allows style/font loading cleanly)
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data:;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, " ").trim();

    response.headers.set("Content-Security-Policy", cspHeader);
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    return response;
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
