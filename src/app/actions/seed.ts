"use server";

import { auth } from "@/auth";
import { createClass, findClassByJoinCode } from "@/lib/firestore/classes";
import { createComment } from "@/lib/firestore/comments";
import { purgeClassAndRelatedData } from "@/lib/firestore/class-purge";
import { createInstructorEnrollment, ensureStudentEnrollment } from "@/lib/firestore/enrollments";
import { createSubmission } from "@/lib/firestore/submissions";
import { createUserDemo, findUserBySfuId } from "@/lib/firestore/users";
import { revalidatePath } from "next/cache";

const DEMO_CLASS_JOIN_CODE = "DEMOCLASS";

const DEMO_STUDENTS = [
  { sfuId: "asmith01", casUsername: "asmith01", name: "Alex Smith" },
  { sfuId: "bjones02", casUsername: "bjones02", name: "Bella Jones" },
  { sfuId: "cpatel03", casUsername: "cpatel03", name: "Chandra Patel" },
  { sfuId: "dkim04", casUsername: "dkim04", name: "David Kim" },
  { sfuId: "elin05", casUsername: "elin05", name: "Elena Lin" },
];

const VIDEOS = {
  zoo: "jNQXAC9IVRw",
  gangnam: "9bZkp7q19f0",
  rick: "dQw4w9WgXcQ",
  despacito: "kJQP7kiw5Fk",
};

interface DemoSubmission {
  title: string;
  groupName: string;
  description: string;
  authorIndexes: number[];
  youtubeVideoIds: string[];
  projectUrls: string[];
  visibility: "PRIVATE" | "PUBLIC";
}

const DEMO_SUBMISSIONS: DemoSubmission[] = [
  {
    title: "Real-Time Chat Application",
    groupName: "Socket Squad",
    description:
      "A full-stack chat app built with Next.js and Socket.IO. Supports multiple rooms, emoji reactions, and live typing indicators.",
    authorIndexes: [0, 1],
    youtubeVideoIds: [VIDEOS.zoo],
    projectUrls: ["https://github.com/example/realtime-chat"],
    visibility: "PUBLIC",
  },
  {
    title: "ML Image Classifier",
    groupName: "Neural Nets",
    description:
      "A convolutional neural network trained on a custom dataset of 12,000 images across 10 categories.",
    authorIndexes: [2, 3],
    youtubeVideoIds: [VIDEOS.gangnam],
    projectUrls: ["https://github.com/example/ml-classifier", "https://example.com/demo"],
    visibility: "PRIVATE",
  },
  {
    title: "Budget Tracker PWA",
    groupName: "FinTech Five",
    description: "A progressive web app for personal finance tracking with offline-first support.",
    authorIndexes: [4, 0],
    youtubeVideoIds: [VIDEOS.rick],
    projectUrls: ["https://github.com/example/budget-pwa"],
    visibility: "PUBLIC",
  },
  {
    title: "WebGL Planet Renderer",
    groupName: "Cosmic Coders",
    description: "A real-time 3D planet renderer running entirely in the browser with WebGL 2.0.",
    authorIndexes: [1, 2],
    youtubeVideoIds: [VIDEOS.despacito],
    projectUrls: ["https://github.com/example/webgl-planet"],
    visibility: "PRIVATE",
  },
  {
    title: "AR Campus Navigation",
    groupName: "SFU AR",
    description: "An augmented reality wayfinding app for SFU Burnaby using ARKit and Apple Maps data.",
    authorIndexes: [3, 4],
    youtubeVideoIds: [VIDEOS.zoo, VIDEOS.gangnam],
    projectUrls: ["https://github.com/example/ar-campus", "https://example-ar.vercel.app"],
    visibility: "PUBLIC",
  },
  {
    title: "Multiplayer Chess Engine",
    groupName: "Game Devs",
    description: "A browser-based multiplayer chess game with a custom engine.",
    authorIndexes: [0, 1, 2],
    youtubeVideoIds: [VIDEOS.rick],
    projectUrls: ["https://github.com/example/chess-engine"],
    visibility: "PRIVATE",
  },
];

const DEMO_COMMENTS: Array<Array<{ authorIndex: number; body: string }>> = [
  [
    { authorIndex: 2, body: "Really smooth UI! Did you handle reconnection when the WebSocket drops?" },
    { authorIndex: 3, body: "Love the emoji reactions. Would be great to see typing indicators too." },
    { authorIndex: 4, body: "The latency in your demo is impressively low. What's your backend stack?" },
  ],
  [
    { authorIndex: 0, body: "Great accuracy results! How did you handle class imbalance in the dataset?" },
    { authorIndex: 4, body: "The confusion matrix visualization is super clear. Nice work on the UI." },
  ],
  [
    { authorIndex: 1, body: "This is exactly what I've been looking for. Does it sync across devices?" },
    { authorIndex: 3, body: "The charts look polished. Did you use Chart.js or D3?" },
    { authorIndex: 2, body: "The offline support is a great touch for a PWA." },
  ],
  [
    { authorIndex: 4, body: "The atmospheric scattering looks stunning!" },
    { authorIndex: 0, body: "Really impressive performance at 60fps." },
  ],
  [
    { authorIndex: 1, body: "Tested it on campus today and it worked perfectly." },
    { authorIndex: 2, body: "Would love to see indoor navigation support in a future version!" },
    { authorIndex: 0, body: "How are you getting the building floor plans?" },
  ],
  [
    { authorIndex: 3, body: "The minimax with alpha-beta pruning is fast!" },
    { authorIndex: 4, body: "Really clean multiplayer matchmaking." },
  ],
];

export async function seedDemoDataAction(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  const session = await auth();
  if (session?.user?.role !== "GLOBAL_ADMIN") {
    return { ok: false, error: "Not allowed" };
  }

  const existing = await findClassByJoinCode(DEMO_CLASS_JOIN_CODE);
  if (existing) {
    return {
      ok: false,
      error: `Demo class already exists (join code: ${DEMO_CLASS_JOIN_CODE}). Clear it first or use the existing one.`,
    };
  }

  const studentIds: string[] = [];
  for (const s of DEMO_STUDENTS) {
    const u = await findUserBySfuId(s.sfuId);
    if (!u) {
      const id = await createUserDemo({ sfuId: s.sfuId, casUsername: s.casUsername, name: s.name });
      studentIds.push(id);
    } else {
      studentIds.push(u.id);
    }
  }

  const demoClassId = await createClass({
    title: "CMPT 272 – Web Development Demo",
    description: "A demo class pre-populated with sample submissions and comments for testing.",
    joinCode: DEMO_CLASS_JOIN_CODE,
    ownerId: session.user.id,
    defaultVisibility: "PRIVATE",
    commentsOnPublic: true,
  });

  await createInstructorEnrollment(demoClassId, session.user.id);
  await Promise.all(studentIds.map((userId) => ensureStudentEnrollment(demoClassId, userId)));

  const submissionIds: string[] = [];
  for (const def of DEMO_SUBMISSIONS) {
    const authors = def.authorIndexes.map((i) => studentIds[i]!);
    const authorMeta = def.authorIndexes.map((i) => DEMO_STUDENTS[i]!);
    const sid = await createSubmission({
      classId: demoClassId,
      title: def.title,
      groupName: def.groupName,
      description: def.description,
      youtubeVideoIds: def.youtubeVideoIds,
      projectUrls: def.projectUrls,
      visibility: def.visibility,
      authorUserIds: authors,
      authorNames: authorMeta.map((a) => a.name),
      authorSfuIds: authorMeta.map((a) => a.sfuId),
      createdById: authors[0]!,
    });
    submissionIds.push(sid);
  }

  await Promise.all(
    DEMO_COMMENTS.flatMap((commentList, subIdx) =>
      commentList.map((c) =>
        createComment({
          submissionId: submissionIds[subIdx]!,
          userId: studentIds[c.authorIndex]!,
          body: c.body,
        })
      )
    )
  );

  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return {
    ok: true,
    message: `Demo class created with ${DEMO_SUBMISSIONS.length} submissions and ${DEMO_COMMENTS.flat().length} comments. Join code: ${DEMO_CLASS_JOIN_CODE}`,
  };
}

export async function clearDemoDataAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await auth();
  if (session?.user?.role !== "GLOBAL_ADMIN") {
    return { ok: false, error: "Not allowed" };
  }

  const demoClass = await findClassByJoinCode(DEMO_CLASS_JOIN_CODE);
  if (!demoClass) {
    return { ok: false, error: "No demo class found." };
  }

  await purgeClassAndRelatedData(demoClass.id);

  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return { ok: true };
}
