import mongoose from "mongoose";
import { resolveMongoUri } from "@/lib/db/resolve-mongo-uri";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }
  if (!cache.promise) {
    const uri = await resolveMongoUri();
    cache.promise = mongoose.connect(uri);
  }
  cache.conn = await cache.promise;
  global.mongooseCache = cache;
  return cache.conn;
}
