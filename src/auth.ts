import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { LeanUser } from "@/lib/types/lean";
import type { JWT } from "next-auth/jwt";

const enableGoogle = process.env.ENABLE_GOOGLE === "true";

/** Next.js middleware runs on Edge; Firestore must not load there. */
function isEdgeRuntime(): boolean {
  return process.env.NEXT_RUNTIME === "edge";
}

async function loadUserIntoToken(token: JWT): Promise<JWT> {
  if (!token.sub || isEdgeRuntime()) {
    return token;
  }
  const { getUserById } = await import("@/lib/firestore/users");
  const u = await getUserById(token.sub);
  if (!u) return token;
  const lean: LeanUser = {
    _id: u.id,
    sfuId: u.sfuId,
    role: u.role,
    name: u.name,
    email: u.email,
    image: u.image,
  };
  token.sfuId = lean.sfuId ?? undefined;
  token.role = lean.role;
  token.name = lean.name ?? token.name;
  token.email = lean.email ?? token.email;
  token.picture = lean.image ?? token.picture;
  return token;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    ...(enableGoogle && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (!isEdgeRuntime() && account?.provider === "google" && profile && "email" in profile) {
        const {
          findUserByGoogleSub,
          createUserGoogle,
          updateUserGoogle,
        } = await import("@/lib/firestore/users");
        const email = profile.email as string | undefined;
        const sub = account.providerAccountId;
        const existing = await findUserByGoogleSub(sub);
        if (!existing) {
          token.sub = await createUserGoogle({
            googleSub: sub,
            email: email ?? undefined,
            name: (profile.name as string) ?? undefined,
            image: (profile.picture as string) ?? undefined,
          });
        } else {
          await updateUserGoogle(existing.id, {
            email: email ?? undefined,
            name: (profile.name as string) ?? undefined,
            image: (profile.picture as string) ?? undefined,
          });
          token.sub = existing.id;
        }
      }

      return loadUserIntoToken(token);
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.sfuId = token.sfuId as string | null | undefined;
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
  },
});
