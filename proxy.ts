import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLLING_RELEASE_PREFIX = "_vcrr";

export function proxy(request: NextRequest) {
  const cookie = request.cookies.getAll();

  const rrCookie = cookie.find((c) =>
    c.name.startsWith(ROLLING_RELEASE_PREFIX),
  );

  console.log(
    JSON.stringify({
      path: request.nextUrl.pathname,
      cookie: rrCookie?.value ?? null,
      timestamp: new Date().toISOString(),
    }),
  );

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const apiPath = request.nextUrl.pathname.replace(/^\/api\//, "");

    // Build a new URL object to manipulate query params easily
    const proxiedUrlObj = new URL(
      `https://rr-back.vercel.zone/${apiPath}${request.nextUrl.search}`,
    );

    const isReleaseCandidate = Number(rrCookie?.value?.split("|")[1]) < 1;

    // If rrCookie exists, add vcrrForceCanary=true to search params
    if (isReleaseCandidate) {
      proxiedUrlObj.searchParams.set("vcrrForceCanary", "true");
    }

    return NextResponse.redirect(proxiedUrlObj, 307);
  }

  const response = NextResponse.next();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
