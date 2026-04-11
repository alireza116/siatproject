import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";

function isSecureCookieContext(): boolean {
  const url = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  return url.startsWith("https://");
}

export function sessionCookieName(): string {
  return isSecureCookieContext() ? "__Secure-authjs.session-token" : "authjs.session-token";
}

export async function setAuthJwtCookie(payload: {
  sub: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  sfuId?: string | null;
  role?: string;
}): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");

  const salt = sessionCookieName();
  const token = await encode({
    token: {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      sub: payload.sub,
      sfuId: payload.sfuId,
      role: payload.role,
    },
    secret,
    salt,
    maxAge: 30 * 24 * 60 * 60,
  });

  const store = await cookies();
  const secure = isSecureCookieContext();
  store.set(salt, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 30 * 24 * 60 * 60,
  });
}
