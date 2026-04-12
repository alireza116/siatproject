---
name: Admin role system
description: akarduni is bootstrap admin; GLOBAL_ADMIN controls class creation and /admin access
type: project
---

`akarduni` is the bootstrap admin, defined in `ADMIN_SFU_IDS=akarduni` (.env). On every CAS login, the CAS callback checks `isBootstrapAdmin(casUsername)` and promotes the user to `GLOBAL_ADMIN` if needed.

**Role gating:**
- Class creation: `GLOBAL_ADMIN` only (checked in `createClassAction` and `/classes/new` page)
- `/admin` route: `GLOBAL_ADMIN` only (middleware + page-level check)
- In-class roles (INSTRUCTOR/ASSISTANT/STUDENT) still exist via Enrollment model for per-class access control

**Admin management UI:** `/admin` page — shows current admins, allows granting to any signed-in user, revoke for non-bootstrap admins.

**Why:** User requested single admin role instead of instructor/student split at the system level.
**How to apply:** When adding features that should be admin-only, check `session.user.role === "GLOBAL_ADMIN"`.
