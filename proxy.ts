import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { get } from "@vercel/edge-config";

const ROLLING_RELEASE_PREFIX = "_vcrr";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
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

    const [deployment = "unknown", percentage = -1] = await Promise.all([
      get<string>("targetDeploymentId"),
      get<number>("targetPercentage"),
    ]);

    const apiPath = request.nextUrl.pathname.replace(/^\/api\//, "");

    // Build a new URL object to manipulate query params easily
    const proxiedUrlObj = new URL(
      `https://rr-back.vercel.zone/${apiPath}${request.nextUrl.search}`,
    );

    const [deploymentId = "", bucket = 0] = rrCookie?.value?.split("|") ?? [];

    const isReleaseCandidate =
      deployment === deploymentId && Number(bucket) < percentage;

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
