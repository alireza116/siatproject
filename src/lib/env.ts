export function getBaseUrl(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getCasCallbackUrl(): string {
  return `${getBaseUrl()}/api/auth/cas/callback`;
}
