import type { Timestamp } from "firebase-admin/firestore";

export function asDate(value: unknown): Date {
  if (value == null) return new Date(0);
  if (value instanceof Date) return value;
  const maybeTs = value as Timestamp | undefined;
  if (typeof maybeTs?.toDate === "function") {
    return maybeTs.toDate();
  }
  return new Date(0);
}
