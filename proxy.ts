import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLLING_RELEASE_COOKIE = "_vcrr";

export function proxy(request: NextRequest) {
  const cookie = request.cookies.getAll();

  const rrCookie = cookie.find((c) => c.name.startsWith(ROLLING_RELEASE_COOKIE));

  console.log(
    JSON.stringify({
      path: request.nextUrl.pathname,
      cookie: rrCookie?.value ?? null,
      timestamp: new Date().toISOString(),
    })
  );

  const response = NextResponse.next();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
