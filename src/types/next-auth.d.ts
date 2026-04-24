import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    sfuId?: string | null;
    role?: string;
    /** User-chosen display alias; falls back to SFU ID in UI when unset. */
    displayName?: string | null;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      sfuId?: string | null;
      role?: string;
      displayName?: string | null;
    };
  }

  interface JWT {
    sfuId?: string | null;
    role?: string;
    displayName?: string | null;
  }
}
