---
name: UI stack — Shadcn base-nova with Tailwind v4
description: Shadcn UI setup uses base-ui/react primitives (not Radix); buttonVariants pattern for link buttons
type: feedback
---

Shadcn UI is set up with the **base-nova preset** (style: "base-nova" in components.json). This uses `@base-ui/react` primitives (Button, Input, etc.) — NOT Radix UI.

**Why this matters:** `asChild` prop does not exist in base-ui Button. To render a `<Link>` as a button, use `buttonVariants` from `@/components/ui/button` with `cn()`:
```tsx
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

<Link href="..." className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
  Label
</Link>
```

**How to apply:** Any time a link needs button styling, use this pattern. Do NOT use `<Button asChild>` — it will fail silently or type-error.

Tailwind v4 is used (no tailwind.config.ts). Theme variables live in `src/app/globals.css` via `@theme inline`.
