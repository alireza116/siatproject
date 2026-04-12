import type { NextRequest } from "next/server";

export function getBaseUrl(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function normalizeBindAllInterfacesOrigin(origin: string): string {
  try {
    const u = new URL(origin);
    if (u.hostname === "0.0.0.0") u.hostname = "localhost";
    return u.origin;
  } catch {
    return origin;
  }
}

/**
 * Public origin for absolute redirects from Route Handlers.
 * Prefer configured AUTH_URL / NEXT_PUBLIC_APP_URL, then proxy headers, then the request Host
 * (so redirects work when the process listens on 0.0.0.0 but the browser uses localhost).
 */
export function getRequestOrigin(req: NextRequest): string {
  const configured = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const scheme =
      forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https";
    return normalizeBindAllInterfacesOrigin(`${scheme}://${forwardedHost}`);
  }

  const host = req.headers.get("host");
  if (host) {
    const scheme = req.nextUrl.protocol === "https:" ? "https" : "http";
    return normalizeBindAllInterfacesOrigin(`${scheme}://${host}`);
  }

  return normalizeBindAllInterfacesOrigin(req.nextUrl.origin);
}

export function getCasCallbackUrl(): string {
  return `${getBaseUrl()}/api/auth/cas/callback`;
}
