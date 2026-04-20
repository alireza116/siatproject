import { getFirestoreDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firestore/constants";

/**
 * For each of the given submission ids, return the set of userIds (drawn from
 * `userIds`) who have reviewed that submission — where "reviewed" means they
 * left a star rating or posted at least one comment on it.
 *
 * Groups tend to be small (≤ ~6 users), so we issue two equality queries per
 * user rather than relying on `in` queries (which are capped at 30).
 */
export async function getGroupReviewsForSubmissions(
  submissionIds: string[],
  userIds: string[],
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  if (submissionIds.length === 0 || userIds.length === 0) return out;

  const submissionSet = new Set(submissionIds);
  const db = getFirestoreDb();

  await Promise.all(
    userIds.map(async (uid) => {
      const [ratings, comments] = await Promise.all([
        db.collection(COL.submissionRatings).where("userId", "==", uid).get(),
        db.collection(COL.comments).where("userId", "==", uid).get(),
      ]);

      const reviewed = new Set<string>();
      for (const d of ratings.docs) {
        const sid = d.data().submissionId as string | undefined;
        if (sid && submissionSet.has(sid)) reviewed.add(sid);
      }
      for (const d of comments.docs) {
        const sid = d.data().submissionId as string | undefined;
        if (sid && submissionSet.has(sid)) reviewed.add(sid);
      }

      for (const sid of reviewed) {
        let cur = out.get(sid);
        if (!cur) {
          cur = new Set<string>();
          out.set(sid, cur);
        }
        cur.add(uid);
      }
    }),
  );

  return out;
}
