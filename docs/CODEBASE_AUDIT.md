# Codebase Audit

Audit date: 2026-07-05

## Existing Architecture Summary

AddiVerse Print Desk is currently a Next.js App Router application branded in code as PrintFlow. It is a compact production-management prototype with authenticated pages, Prisma-backed data models, basic project creation, file upload/storage, soft deletion, backup cron jobs, and several placeholder modules.

Current framework and key versions from `package.json`:

- Next.js `16.2.9`
- React `19.2.4`
- TypeScript `^5`
- Prisma `7.8.0`
- Better Auth `1.6.22`
- Tailwind CSS `^4`
- Three.js `0.185.0`
- `@react-three/fiber` `9.6.1`
- `@react-three/drei` `10.7.7`
- PostgreSQL adapter `@prisma/adapter-pg` with `pg`
- Storage dependencies include AWS S3 SDK, Supabase client, UploadThing, and local/R2 storage code

## App Router Structure

Routes currently found:

- `/` redirects to `/dashboard`.
- `/sign-in` provides Better Auth email/password sign-in.
- Authenticated app shell under `app/(app)/layout.tsx`.
- Authenticated pages:
  - `/dashboard`
  - `/users`
  - `/customers`
  - `/projects`
  - `/files`
  - `/printers`
  - `/production`
  - `/notifications`
  - `/reports`
  - `/settings`
- API routes:
  - `/api/auth/[...all]`
  - `/api/projects/[projectId]`
  - `/api/projects/[projectId]/files`
  - `/api/files/[fileId]`
  - `/api/cron/storage-retention`
  - `/api/cron/database-backup`

There is no current `/admin` route group, `/work` route group, route middleware, employee verification flow, or three-tab employee workspace.

## Authentication Setup

Better Auth is configured in `lib/auth.ts` with:

- Prisma adapter using `getPrisma()`
- Email/password authentication enabled
- Email verification disabled
- Additional user fields: `role`, `status`, `phone`
- `nextCookies()` plugin

Session helpers in `lib/session.ts`:

- `getServerSession()`
- `requireSession()`, redirecting to `/sign-in`
- `getSessionFromRequest()`

Authorization helpers in `server/authz.ts`:

- Normalizes roles to `MASTER_ADMIN`, `SUB_ADMIN`, or `EMPLOYEE`
- Allows project/storage management for `MASTER_ADMIN` and `SUB_ADMIN`

Current roles do not match the requested final admin role names exactly. `MASTER_ADMIN` and `SUB_ADMIN` can be mapped to `SUPER_ADMIN` and `ADMIN`, or retained with a documented compatibility layer.

## Prisma 7 And Database Configuration

Prisma configuration:

- Schema: `prisma/schema.prisma`
- Client output: `app/generated/prisma`
- Datasource provider: PostgreSQL
- Connection URL supplied through `prisma.config.ts` via `DATABASE_URL`
- Runtime Prisma client uses `PrismaPg` adapter in `lib/prisma.ts`

There is no `prisma/migrations` directory in the repository. The current migration strategy is therefore not versioned in source. This is a major risk for production data preservation.

## PostgreSQL/Supabase Connection Strategy

The code expects PostgreSQL through `DATABASE_URL`. The example env file indicates Supabase/Postgres usage, but it currently contains real-looking credential values and secret values. Those values must be rotated and replaced with placeholders.

No Supabase storage implementation is present despite `SUPABASE` existing in the `StorageProvider` enum and `@supabase/supabase-js` being installed.

## Existing Prisma Models And Relations

Existing models:

- `User`
- `Session`
- `Account`
- `Verification`
- `Customer`
- `Printer`
- `Project`
- `ProjectFile`
- `BackupJob`
- `ProductionEvent`
- `Notification`
- `ActivityLog`
- `Setting`

Existing enums:

- `UserRole`: `MASTER_ADMIN`, `SUB_ADMIN`, `EMPLOYEE`
- `UserStatus`: `ACTIVE`, `INVITED`, `SUSPENDED`
- `Priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `ProjectStatus`: `DRAFT`, `ASSIGNED`, `PRINTING`, `PAUSED`, `QUALITY_CHECK`, `READY_FOR_PICKUP`, `DELIVERED`, `COMPLETED`, `CANCELLED`
- `PrinterStatus`: `AVAILABLE`, `BUSY`, `OFFLINE`, `MAINTENANCE`
- `FileKind`: `FOLDER`, `STL`, `OBJ`, `GLB`, `GLTF`, `PDF`, `ZIP`, `IMAGE`, `OTHER`
- `ProductionEventType`: `STARTED`, `PAUSED`, `RESUMED`, `FINISHED`, `QUANTITY_UPDATED`, `NOTE_ADDED`, `IMAGE_UPLOADED`
- `NotificationChannel`: `EMAIL`, `WHATSAPP`, `IN_APP`
- `NotificationStatus`: `PENDING`, `SENT`, `FAILED`, `READ`
- `StorageProvider`: `LOCAL`, `R2`, `SUPABASE`
- `BackupStatus`: `PENDING`, `COMPLETED`, `FAILED`

The current `Project` model is the nearest equivalent to the requested `Job` model. `Customer` is the nearest equivalent to `Client`. `ProjectFile` is the nearest equivalent to `JobFile`.

## Existing API Routes And Server Actions

API handlers:

- Auth handler delegates to Better Auth.
- Project delete route supports immediate soft delete or scheduled deletion and logs activity.
- Project file route supports listing and uploading files for a project.
- File delete route supports immediate storage deletion or scheduled deletion.
- Storage-retention cron soft deletes scheduled projects and files and deletes scheduled file objects from storage.
- Database-backup cron snapshots several tables to configured storage.

Server actions:

- `app/(app)/projects/page.tsx` includes `createProject`.
- `app/(app)/users/page.tsx` includes `createUser` and `updateUserAccess`.

Input validation is mostly manual and partial. Some actions instantiate dates and enum-like values, but there is no shared Zod validation layer for mutations.

## Current Admin Pages

Implemented with real data:

- `/users`: create users, update role/status, password hashing via Better Auth crypto, activity logs.
- `/projects`: create projects/customers, list projects, basic metrics, upload/delete panels.

Static or placeholder data:

- `/dashboard`: static KPI/demo data.

Placeholder modules:

- `/customers`
- `/printers`
- `/production`
- `/notifications`
- `/reports`
- `/settings`

## Current Employee And Workflow Pages

Employees currently use the same authenticated shell as admins. The nav exposes `/dashboard`, `/projects`, `/files`, `/production`, and `/notifications` to `EMPLOYEE` users.

There is no PIN-based employee verification, shift session, `/work` portal, or server-controlled employee workflow state machine.

## Existing Reusable UI Components

Reusable components worth preserving:

- Layout shell: `components/layout/app-sidebar.tsx`, `components/layout/app-topbar.tsx`, `components/layout/footer.tsx`
- Auth: `components/auth/sign-in-form.tsx`, `components/auth/sign-out-button.tsx`
- UI primitives: `button`, `card`, `input`, `label`, `textarea`, `table`, `badge`
- Storage and project utility panels can be refactored into admin job-file tooling.
- `ModulePlaceholder` should be removed or replaced as modules become real.

The current component style is clean and consistent enough to reuse for the admin portal. The employee portal needs a separate touch-friendly shell rather than the existing sidebar-heavy admin shell.

## File Upload And Storage Implementation

Storage abstraction exists under `server/storage`:

- `getStorageProvider()`
- `assertUploadableFile()`
- `buildStorageObject()`
- `buildUploadKey()`
- Local provider writes to `.storage`
- R2 provider uploads/deletes through S3-compatible Cloudflare R2

Allowed extensions:

- `stl`, `obj`, `glb`, `gltf`, `pdf`, `zip`, `png`, `jpg`, `jpeg`, `webp`

Maximum upload size:

- 250 MB

Current gaps:

- No download API for private/local files.
- Local storage returns no public URL.
- R2 can expose public URLs, but there is no signed/private URL strategy.
- No file preview components.
- File validation is extension-based and does not deeply inspect content.
- File delete can remove storage objects, which conflicts with "completed jobs must never be automatically deleted" unless retention is re-scoped.

## Existing 3D File Handling

Dependencies for 3D rendering are installed:

- `three`
- `@react-three/fiber`
- `@react-three/drei`

No actual 3D preview component or model loader route was found. Browser preview support should be implemented only for formats the viewer actually parses.

## Existing WhatsApp Integration

Schema and placeholder UI reference WhatsApp through:

- `Customer.whatsapp`
- `NotificationChannel.WHATSAPP`
- env placeholders for future WhatsApp Cloud API token

No implemented WhatsApp handoff or API integration was found.

## Existing Activity Logging

`ActivityLog` exists with:

- `actorId`
- `action`
- `entity`
- `entityId`
- `metadata`
- `createdAt`

Existing actions log user creation, user access update, project creation, project deletion, file upload/delete, storage retention, and backup completion.

The target system needs activity logging extended to distinguish admin actors from employee actors and to link directly to jobs, shift sessions, production runs, handovers, photos, and delivery events.

## Environment Variables

Current env variable names observed:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`
- `STORAGE_PROVIDER`
- `RESEND_API_KEY`
- `WHATSAPP_CLOUD_API_TOKEN`
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET`
- `CLOUDFLARE_R2_PUBLIC_URL`
- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`

Security issue: `.env.example` contains real-looking secrets and database credentials. Rotate any exposed values, scrub the file, and keep only placeholders.

## Vercel Deployment Configuration

`vercel.json` defines two cron jobs:

- `/api/cron/storage-retention` at `0 2 * * *`
- `/api/cron/database-backup` at `30 2 * * *`

`next.config.ts` has no custom configuration.

## Current Database Migration Strategy

No checked-in Prisma migrations are present. Prisma config points to `prisma/migrations`, but the directory does not exist. The repository likely relied on generated client output and direct schema sync rather than controlled migrations.

## Features That Can Be Reused

- Better Auth admin authentication.
- Existing `User`, `Session`, `Account`, and `Verification` models.
- Role/status fields with a compatibility mapping.
- `Customer` as the base for `Client`.
- `Project` as the base for `Job`, if migrated carefully.
- `ProjectFile` as the base for `JobFile`.
- `Printer` model and printer status enum as a starting point.
- `ProductionEvent` concepts, though the target likely needs `ProductionRun` and `JobProgressUpdate`.
- `ActivityLog`, extended rather than replaced.
- Storage abstraction and local/R2 providers.
- File extension mapping for STL, OBJ, GLB, GLTF, PDF, image, and other files.
- Existing UI primitives and admin shell styling.
- Cron secret helper and Vercel cron setup, after adjusting retention behavior.

## Features That Need Refactoring

- Current route structure into `/admin` and `/work`.
- `ProjectStatus` into explicit workflow statuses: `NEW`, `IN_PROGRESS`, `READY_TO_DELIVER`, `DISPATCHED`, `ARCHIVED`, with optional `ON_HOLD` and `CANCELLED`.
- Employee users should not rely on email/password login for workspace access.
- Admin and employee authorization must be enforced independently in UI and API routes.
- Project creation form should become multi-section admin job creation with stronger validation.
- File upload needs integrated job creation/detail flow, download endpoints, preview metadata, and private URL strategy.
- Activity logs need actor type and richer job/workflow links.
- Storage retention should not delete historical production artifacts by default.
- Dashboard must move from static arrays to database queries.
- Placeholder pages must become real modules.

## Features To Remove Or Deprecate

- Delete/scheduled-deletion flows for production jobs and files should be deprecated or heavily restricted.
- Employee access to the admin-style sidebar app should be replaced by `/work`.
- Static dashboard metrics should be removed.
- Placeholder module pages should be replaced as each module is implemented.
- Plain project ID entry for uploads should be replaced by contextual job file upload controls.
- Real-looking secrets in `.env.example` must be removed immediately.

## Database Migration Risks

- Existing `Project` rows need status mapping to the new workflow without data loss.
- Existing `Customer` rows need mapping to `Client` fields.
- `Project.quantity`, `printedQuantity`, `deliveryDate`, `material`, and `notes` must be preserved.
- Current `ProjectFile` records may lack durable URLs for local storage; download strategy must account for `storageKey`.
- `createdById` and `updatedById` are nullable in several models. Backfill strategy is needed.
- No migration history exists in source, so first controlled migration may need baselining against the live database.
- Enum changes can be risky in PostgreSQL; prefer additive enum/model changes before renaming/removing values.
- Existing scheduled deletion fields conflict with historical retention requirements.
- Generated Prisma client lives under `app/generated/prisma`; changes will affect imports and build output.

## Security Risks

- Real-looking secrets and database credentials are present in `.env.example`.
- Better Auth secret has a development fallback in source. Production must require an explicit secret.
- No route middleware protects admin/employee route groups.
- Employee portal requirements are not implemented.
- API authorization is partial and domain-specific.
- Input validation is manual and inconsistent.
- No rate limiting for sign-in or future employee PIN attempts was found.
- File access control for downloads/previews is incomplete.
- Public R2 URL support may expose sensitive client files if used without private access policy.
- Backup route serializes broad table data into storage; storage access and backup retention need review.
- Activity metadata is free-form JSON and needs rules to prevent secret/PII leakage.

## Recommended Implementation Order

1. Scrub `.env.example`, rotate exposed secrets, and document env variables.
2. Create a controlled database migration baseline before schema changes.
3. Add workflow enums and additive models for employee verification, shifts, production runs, progress updates, photos, delivery, handover, and richer activity logging.
4. Add server-side authorization helpers for admin and employee session contexts.
5. Build `/admin` route group and move/refactor existing authenticated admin pages into it.
6. Build employee PIN verification and `/work` shell.
7. Implement workflow transitions as server mutations with transactions and activity logs.
8. Add file preview/download abstraction and lazy 3D viewer.
9. Replace dashboard placeholders with real queries.
10. Harden validation, authorization, testing, deployment, and backup/retention behavior.
