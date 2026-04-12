"use server";

import { auth } from "@/auth";
import { dbConnect } from "@/lib/db/connect";
import { User } from "@/lib/models/User";
import { ClassModel } from "@/lib/models/Class";
import { Enrollment } from "@/lib/models/Enrollment";
import { Submission } from "@/lib/models/Submission";
import { Comment } from "@/lib/models/Comment";
import { revalidatePath } from "next/cache";

const DEMO_CLASS_JOIN_CODE = "DEMOCLASS";

// ---------------------------------------------------------------------------
// Static demo content
// ---------------------------------------------------------------------------

const DEMO_STUDENTS = [
  { sfuId: "asmith01", casUsername: "asmith01", name: "Alex Smith" },
  { sfuId: "bjones02", casUsername: "bjones02", name: "Bella Jones" },
  { sfuId: "cpatel03", casUsername: "cpatel03", name: "Chandra Patel" },
  { sfuId: "dkim04",   casUsername: "dkim04",   name: "David Kim"    },
  { sfuId: "elin05",   casUsername: "elin05",   name: "Elena Lin"    },
];

// Real public YouTube video IDs that embed reliably
const VIDEOS = {
  zoo:      "jNQXAC9IVRw", // "Me at the zoo" – first ever YouTube video
  gangnam:  "9bZkp7q19f0", // PSY – Gangnam Style
  rick:     "dQw4w9WgXcQ", // Rick Astley – Never Gonna Give You Up
  despacito:"kJQP7kiw5Fk", // Luis Fonsi – Despacito
};

interface DemoSubmission {
  title: string;
  groupName: string;
  description: string;
  authorIndexes: number[];   // indexes into DEMO_STUDENTS
  youtubeVideoIds: string[];
  projectUrls: string[];
  visibility: "PRIVATE" | "PUBLIC";
}

const DEMO_SUBMISSIONS: DemoSubmission[] = [
  {
    title: "Real-Time Chat Application",
    groupName: "Socket Squad",
    description:
      "A full-stack chat app built with Next.js and Socket.IO. Supports multiple rooms, emoji reactions, and live typing indicators. Messages are persisted in MongoDB with a Redis pub/sub layer for horizontal scalability. Deployed on Vercel with a Fly.io Socket.IO server.",
    authorIndexes: [0, 1],
    youtubeVideoIds: [VIDEOS.zoo],
    projectUrls: ["https://github.com/example/realtime-chat"],
    visibility: "PUBLIC",
  },
  {
    title: "ML Image Classifier",
    groupName: "Neural Nets",
    description:
      "A convolutional neural network trained on a custom dataset of 12,000 images across 10 categories. Achieved 94.2% top-1 accuracy after applying data augmentation and transfer learning from ResNet-50. The web interface lets users upload images and receive predictions with confidence scores in real time.",
    authorIndexes: [2, 3],
    youtubeVideoIds: [VIDEOS.gangnam],
    projectUrls: [
      "https://github.com/example/ml-classifier",
      "https://example.com/demo",
    ],
    visibility: "PRIVATE",
  },
  {
    title: "Budget Tracker PWA",
    groupName: "FinTech Five",
    description:
      "A progressive web app for personal finance tracking with offline-first support via a service worker and IndexedDB. Features include recurring transaction templates, multi-currency support, and exportable CSV reports. Syncs to the cloud when a connection is available using a background sync strategy.",
    authorIndexes: [4, 0],
    youtubeVideoIds: [VIDEOS.rick],
    projectUrls: ["https://github.com/example/budget-pwa"],
    visibility: "PUBLIC",
  },
  {
    title: "WebGL Planet Renderer",
    groupName: "Cosmic Coders",
    description:
      "A real-time 3D planet renderer running entirely in the browser with WebGL 2.0. Implements atmospheric scattering using the Rayleigh and Mie scattering models, procedural cloud layers via 3D Perlin noise, and a dynamic day/night terminator. Runs at 60 fps on mid-range hardware.",
    authorIndexes: [1, 2],
    youtubeVideoIds: [VIDEOS.despacito],
    projectUrls: ["https://github.com/example/webgl-planet"],
    visibility: "PRIVATE",
  },
  {
    title: "AR Campus Navigation",
    groupName: "SFU AR",
    description:
      "An augmented reality wayfinding app for SFU Burnaby using ARKit and Apple Maps data. Point your phone at any building and see real-time walking directions overlaid on the camera feed. Indoor floor plans are sourced from the SFU Open Data portal and rendered as AR overlays when within 20 m of an entrance.",
    authorIndexes: [3, 4],
    youtubeVideoIds: [VIDEOS.zoo, VIDEOS.gangnam],
    projectUrls: [
      "https://github.com/example/ar-campus",
      "https://example-ar.vercel.app",
    ],
    visibility: "PUBLIC",
  },
  {
    title: "Multiplayer Chess Engine",
    groupName: "Game Devs",
    description:
      "A browser-based multiplayer chess game with a custom engine capable of searching to depth 8 using minimax with alpha-beta pruning and a transposition table. Matchmaking is handled over WebSockets with a Node.js server. Includes spectator mode, move history export to PGN, and an ELO rating system.",
    authorIndexes: [0, 1, 2],
    youtubeVideoIds: [VIDEOS.rick],
    projectUrls: ["https://github.com/example/chess-engine"],
    visibility: "PRIVATE",
  },
];

// Comments per submission (authorIndex → body)
const DEMO_COMMENTS: Array<Array<{ authorIndex: number; body: string }>> = [
  // submission 0 – Real-Time Chat
  [
    { authorIndex: 2, body: "Really smooth UI! Did you handle reconnection when the WebSocket drops?" },
    { authorIndex: 3, body: "Love the emoji reactions. Would be great to see typing indicators too." },
    { authorIndex: 4, body: "The latency in your demo is impressively low. What's your backend stack?" },
  ],
  // submission 1 – ML Classifier
  [
    { authorIndex: 0, body: "Great accuracy results! How did you handle class imbalance in the dataset?" },
    { authorIndex: 4, body: "The confusion matrix visualization is super clear. Nice work on the UI." },
  ],
  // submission 2 – Budget Tracker
  [
    { authorIndex: 1, body: "This is exactly what I've been looking for. Does it sync across devices?" },
    { authorIndex: 3, body: "The charts look polished. Did you use Chart.js or D3?" },
    { authorIndex: 2, body: "The offline support is a great touch for a PWA. How large is the service worker bundle?" },
  ],
  // submission 3 – WebGL Planet
  [
    { authorIndex: 4, body: "The atmospheric scattering looks stunning! Did you implement it from scratch or use a shader library?" },
    { authorIndex: 0, body: "Really impressive performance at 60fps. Did you use instanced rendering for the star field?" },
  ],
  // submission 4 – AR Campus
  [
    { authorIndex: 1, body: "Tested it on campus today and it worked perfectly. The waypoint arrows are intuitive." },
    { authorIndex: 2, body: "Would love to see indoor navigation support in a future version!" },
    { authorIndex: 0, body: "How are you getting the building floor plans? Are they from the SFU open data portal?" },
  ],
  // submission 5 – Chess Engine
  [
    { authorIndex: 3, body: "The minimax with alpha-beta pruning is fast! What depth are you searching to?" },
    { authorIndex: 4, body: "Really clean multiplayer matchmaking. Did you use WebSockets or WebRTC?" },
  ],
];

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function seedDemoDataAction(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  const session = await auth();
  if (session?.user?.role !== "GLOBAL_ADMIN") {
    return { ok: false, error: "Not allowed" };
  }

  await dbConnect();

  // Check if demo class already exists
  const existing = await ClassModel.findOne({ joinCode: DEMO_CLASS_JOIN_CODE });
  if (existing) {
    return {
      ok: false,
      error: `Demo class already exists (join code: ${DEMO_CLASS_JOIN_CODE}). Clear it first or use the existing one.`,
    };
  }

  // 1. Upsert demo students
  const studentDocs = await Promise.all(
    DEMO_STUDENTS.map(async (s) => {
      const existing = await User.findOne({ sfuId: s.sfuId });
      if (existing) return existing;
      return User.create({ sfuId: s.sfuId, casUsername: s.casUsername, name: s.name });
    })
  );

  // 2. Create the demo class owned by the current admin
  const demoClass = await ClassModel.create({
    title: "CMPT 272 – Web Development Demo",
    description: "A demo class pre-populated with sample submissions and comments for testing.",
    joinCode: DEMO_CLASS_JOIN_CODE,
    ownerId: session.user.id,
    defaultVisibility: "PRIVATE",
    commentsOnPublic: true,
  });

  // 3. Enroll admin as instructor
  await Enrollment.create({
    classId: demoClass._id,
    userId: session.user.id,
    role: "INSTRUCTOR",
  });

  // 4. Enroll all demo students
  await Promise.all(
    studentDocs.map((s) =>
      Enrollment.create({ classId: demoClass._id, userId: s._id, role: "STUDENT" })
    )
  );

  // 5. Create submissions
  const submissionDocs = await Promise.all(
    DEMO_SUBMISSIONS.map(async (def) => {
      const authors = def.authorIndexes.map((i) => studentDocs[i]);
      return Submission.create({
        classId: demoClass._id,
        title: def.title,
        groupName: def.groupName,
        description: def.description,
        youtubeVideoIds: def.youtubeVideoIds,
        projectUrls: def.projectUrls,
        visibility: def.visibility,
        authorUserIds: authors.map((a) => a._id),
        authorNames: authors.map((a) => a.name ?? a.sfuId),
        authorSfuIds: authors.map((a) => a.sfuId),
        createdById: authors[0]._id,
      });
    })
  );

  // 6. Create comments
  await Promise.all(
    DEMO_COMMENTS.flatMap((commentList, subIdx) =>
      commentList.map((c) =>
        Comment.create({
          submissionId: submissionDocs[subIdx]._id,
          userId: studentDocs[c.authorIndex]._id,
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

  await dbConnect();

  const demoClass = await ClassModel.findOne({ joinCode: DEMO_CLASS_JOIN_CODE });
  if (!demoClass) {
    return { ok: false, error: "No demo class found." };
  }

  const submissions = await Submission.find({ classId: demoClass._id });
  const submissionIds = submissions.map((s) => s._id);

  await Comment.deleteMany({ submissionId: { $in: submissionIds } });
  await Submission.deleteMany({ classId: demoClass._id });
  await Enrollment.deleteMany({ classId: demoClass._id });
  await ClassModel.deleteOne({ _id: demoClass._id });

  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return { ok: true };
}
