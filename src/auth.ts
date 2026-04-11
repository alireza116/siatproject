import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { leanOne } from "@/lib/mongoose-lean";
import type { LeanUser } from "@/lib/types/lean";
import type { JWT } from "next-auth/jwt";

const enableGoogle = process.env.ENABLE_GOOGLE === "true";

/** Next.js middleware runs on Edge; Mongoose must not load there. */
function isEdgeRuntime(): boolean {
  return process.env.NEXT_RUNTIME === "edge";
}

async function loadUserIntoToken(token: JWT): Promise<JWT> {
  if (!token.sub || isEdgeRuntime()) {
    return token;
  }
  const { dbConnect } = await import("@/lib/db/connect");
  const { User } = await import("@/lib/models/User");
  await dbConnect();
  const raw = await User.findById(token.sub).lean();
  const u = leanOne<LeanUser>(raw);
  if (!u) return token;
  token.sfuId = u.sfuId ?? undefined;
  token.role = u.role;
  token.name = u.name ?? token.name;
  token.email = u.email ?? token.email;
  token.picture = u.image ?? token.picture;
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
        const { dbConnect } = await import("@/lib/db/connect");
        const { User } = await import("@/lib/models/User");
        await dbConnect();
        const email = profile.email as string | undefined;
        const sub = account.providerAccountId;
        let user = await User.findOne({ googleSub: sub });
        if (!user) {
          user = await User.create({
            googleSub: sub,
            email: email ?? undefined,
            name: (profile.name as string) ?? undefined,
            image: (profile.picture as string) ?? undefined,
          });
        } else {
          user.email = email ?? user.email;
          user.name = (profile.name as string) ?? user.name;
          user.image = (profile.picture as string) ?? user.image;
          await user.save();
        }
        token.sub = user._id.toString();
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
