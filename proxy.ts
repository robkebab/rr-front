import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cookie we set so /api/* knows whether this session was served canary or stable.
 * Set from x-vercel-canary-id (platform sends this when canary is served and "canary response header" is enabled).
 * We persist it so backend /api redirects get vcrrForceCanary. No Edge Config.
 *
 * Platform behavior: the platform's _vcrr_<key> cookie is effectively reset when a new rolling release
 * starts (cookie value is deploymentId|bucket; if deploymentId != current target, the platform ignores it).
 * We overwrite rr-tier on every page load from x-vercel-canary-id, so a new RR or completed RR is
 * reflected on the next page load. We cannot set the exact _vcrr_ cookie: (1) backend is a different
 * origin, so we cannot set its cookie; (2) front's _vcrr_ key is _vcrr_<hash(projectId)> and we don't
 * have projectId in the app. So we use our own cookie and pass vcrrForceCanary; the backend sets
 * its own _vcrr_ cookie when it serves the response.
 */
const RR_TIER_COOKIE = "rr-tier";

/** Value is "stable" or "canary" or "canary:<deploymentId>" for traceability. */
function isCanaryTier(value: string | undefined): boolean {
  if (!value) return false;
  return value === "canary" || value.startsWith("canary:");
}

const LOG_PREFIX = "[rr-proxy]";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (!path.startsWith("/api/")) {
    // Page request: persist canary/stable from platform header so /api/* can use it
    const canaryId = request.headers.get("x-vercel-canary-id");
    const isCanary = canaryId != null && canaryId !== "";
    const tier = isCanary ? (canaryId ? `canary:${canaryId}` : "canary") : "stable";
    const res = NextResponse.next();
    res.cookies.set(RR_TIER_COOKIE, tier, {
      path: "/",
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24,
    });
    return res;
  }

  // /api/*: redirect to backend; add vcrrForceCanary only if this session was served canary (from cookie)
  const apiPath = path.replace(/^\/api\//, "");
  const backBase =
    process.env.RR_BACK_URL ?? "https://rr-back.vercel.zone";
  const baseRedirectUrl = `${backBase.replace(/\/$/, "")}/${apiPath.replace(/^\//, "")}${request.nextUrl.search}`;
  const proxiedUrlObj = new URL(baseRedirectUrl);

  const tier = request.cookies.get(RR_TIER_COOKIE)?.value;
  if (isCanaryTier(tier)) {
    proxiedUrlObj.searchParams.set("vcrrForceCanary", "true");
  }

  const finalUrl = proxiedUrlObj.toString();
  console.log(`${LOG_PREFIX} /api path=${path} rr-tier=${tier ?? "none"} -> ${finalUrl}`);
  const res = NextResponse.redirect(proxiedUrlObj, 307);
  res.headers.set("x-rr-proxy", "redirect");
  res.headers.set("x-rr-proxy-location", finalUrl);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
