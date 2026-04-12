---
name: Project overview
description: Tech stack and key architecture for VideoSubmitter
type: project
---

Next.js 16.2, React 19, Tailwind CSS v4, Shadcn UI (base-nova preset using @base-ui/react), MongoDB via Mongoose, NextAuth v5 beta with SFU CAS + optional Google OAuth.

Auth: JWT sessions. SFU CAS is the primary sign-in method. CAS callback auto-promotes admin users.

**Why:** Student project submission system for SFU courses.
**How to apply:** When adding features, follow the established patterns: server components fetch data, client components handle interactivity. Use Shadcn components from src/components/ui/.
