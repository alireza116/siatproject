import type { MongoMemoryServer } from "mongodb-memory-server";

declare global {
  var __mongoMemoryServer: MongoMemoryServer | undefined;
  var __mongoMemoryUriPromise: Promise<string> | undefined;
}

/**
 * Resolves the MongoDB connection string.
 * - If `MONGODB_URI` is set → use it (Atlas, local mongod, etc.).
 * - If unset in **development** → start a one-off MongoDB Memory Server (downloads a `mongod` binary on first run).
 * - In **production** → `MONGODB_URI` is required.
 */
export async function resolveMongoUri(): Promise<string> {
  const fromEnv = process.env.MONGODB_URI?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MONGODB_URI is required in production. Set it to your MongoDB Atlas or self-hosted connection string."
    );
  }

  if (process.env.DISABLE_IN_MEMORY_MONGO === "true") {
    throw new Error(
      "MONGODB_URI is not set and DISABLE_IN_MEMORY_MONGO=true. Set MONGODB_URI to a real MongoDB, or remove DISABLE_IN_MEMORY_MONGO to use the embedded dev database."
    );
  }

  if (!globalThis.__mongoMemoryUriPromise) {
    globalThis.__mongoMemoryUriPromise = (async () => {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      if (!globalThis.__mongoMemoryServer) {
        if (process.env.NODE_ENV === "development") {
          console.info(
            "[db] MONGODB_URI not set — starting MongoDB Memory Server (first run may download mongod)…"
          );
        }
        globalThis.__mongoMemoryServer = await MongoMemoryServer.create();
      }
      return globalThis.__mongoMemoryServer.getUri();
    })();
  }

  return globalThis.__mongoMemoryUriPromise;
}
