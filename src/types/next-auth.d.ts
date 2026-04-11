import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    sfuId?: string | null;
    role?: string;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      sfuId?: string | null;
      role?: string;
    };
  }

  interface JWT {
    sfuId?: string | null;
    role?: string;
  }
}
