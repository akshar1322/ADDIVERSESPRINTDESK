# Database Migration Plan

Audit date: 2026-07-05

## Current State

The repository has a Prisma 7 schema at `prisma/schema.prisma` and a generated client at `app/generated/prisma`, but no checked-in `prisma/migrations` directory. The app uses PostgreSQL through `DATABASE_URL` with `@prisma/adapter-pg`.

The current production concepts are:

- `User` for admins and employees with Better Auth login support.
- `Customer` for clients.
- `Project` for print jobs.
- `ProjectFile` for uploaded production files.
- `Printer` for machines.
- `ProductionEvent` for simple production activity.
- `ActivityLog` for audit history.
- `Notification`, `BackupJob`, and `Setting` for supporting features.

## Migration Principles

- Preserve all existing data.
- Prefer additive migrations first.
- Do not delete or rename columns until the replacement has been backfilled and verified.
- Do not automatically delete completed or historical jobs/files.
- Keep Better Auth tables compatible with Better Auth.
- Avoid large enum rewrites in the first migration.
- Use server-generated timestamps for workflow state.
- Run destructive changes only against a safe database copy after manual approval.

## Model Mapping

Recommended mapping:

- `User` remains the authenticated admin model and may temporarily retain employee accounts for compatibility.
- `Customer` should either be retained and renamed later to `Client`, or kept as the database table behind a `Client` domain service.
- `Project` should become the backing table for `Job` behavior initially. A later table rename can be considered only after the application is stable.
- `ProjectFile` should become the backing table for `JobFile` behavior initially.
- `ProductionEvent` can be retained as legacy history but should be complemented by `ProductionRun` and `JobProgressUpdate`.
- `ActivityLog` should be extended for admin/employee actors rather than replaced immediately.

This avoids early destructive renames and keeps existing foreign keys intact.

## Phase 2 Additive Schema Changes

Recommended first migration changes:

1. Add workflow status support.
   - Either add new `JobStatus` enum and a new nullable `workflowStatus` field on `Project`, or add new values to `ProjectStatus`.
   - Safer first step: add `workflowStatus JobStatus @default(NEW)` to `Project`.

2. Add richer job fields to `Project`.
   - `jobNumber String? @unique`
   - `expectedCompletionAt DateTime?`
   - `requiredQuantity Int?`
   - `adminInstructions String?`
   - `deliveryNotes String?`
   - `materialTypeId String?`
   - `startedAt DateTime?`
   - `completedAt DateTime?`
   - `readyToDeliverAt DateTime?`
   - `dispatchedAt DateTime?`
   - `archivedAt DateTime?`

3. Add client compatibility fields to `Customer`.
   - `contactPerson String?`
   - Keep existing `phone`, `whatsapp`, `address`, and `notes`.

4. Add `MaterialType`.
   - `id`
   - `name`
   - `code`
   - `unit`
   - `isActive`
   - timestamps

5. Add employee verification models.
   - `Employee`
   - `EmployeeSession`
   - `ShiftDefinition`
   - `ShiftSession`

6. Add production tracking models.
   - `ProductionRun`
   - `JobProgressUpdate`

7. Add completion and delivery models.
   - `JobPhoto`
   - `Delivery`
   - `Handover`

8. Extend `ProjectFile`.
   - `fileExtension String?`
   - `previewType FilePreviewType?`
   - Keep `kind` for compatibility.

9. Extend `Printer`.
   - `machineNumber String?`
   - `location String?`
   - `isActive Boolean @default(true)`

10. Extend `ActivityLog`.
   - `actorType ActivityActorType?`
   - `actorAdminId String?`
   - `actorEmployeeId String?`
   - `projectId String?`
   - `shiftSessionId String?`

## Suggested New Enums

Additive enums:

- `JobStatus`: `NEW`, `IN_PROGRESS`, `READY_TO_DELIVER`, `DISPATCHED`, `ARCHIVED`, `ON_HOLD`, `CANCELLED`
- `ShiftType`: `DAY`, `NIGHT`, `CUSTOM`
- `ProductionRunStatus`: `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`
- `PhotoType`: `COMPLETION`, `PACKAGING`, `DISPATCH`
- `ActivityActorType`: `ADMIN`, `EMPLOYEE`, `SYSTEM`
- `FilePreviewType`: `MODEL_3D`, `IMAGE`, `PDF`, `DOWNLOAD_ONLY`
- Optional `MaterialUnit`: `GRAM`, `KILOGRAM`, `METER`, `MILLIMETER`, `PIECE`, `OTHER`

## Backfill Plan

After additive migration:

1. Backfill `Project.requiredQuantity` from `Project.quantity`.
2. Backfill `Project.expectedCompletionAt` from `Project.deliveryDate`.
3. Backfill `Project.workflowStatus` from `Project.status`:
   - `DRAFT`, `ASSIGNED` -> `NEW`
   - `PRINTING`, `PAUSED`, `QUALITY_CHECK` -> `IN_PROGRESS`
   - `READY_FOR_PICKUP` -> `READY_TO_DELIVER`
   - `DELIVERED`, `COMPLETED` -> `DISPATCHED` or `ARCHIVED` based on business preference and dates
   - `CANCELLED` -> `CANCELLED`
4. Backfill `Project.jobNumber` with deterministic generated values for existing rows.
5. Backfill `ProjectFile.fileExtension` from `ProjectFile.name`.
6. Backfill `ProjectFile.previewType` from `ProjectFile.kind`.
7. Create `MaterialType` rows from distinct existing `Project.material` values.
8. Link projects to material types where possible.
9. Set `ActivityLog.actorType` based on existing `actorId` role when available; otherwise `SYSTEM`.
10. Create default `ShiftDefinition` rows for day and night shifts, but keep hours configurable.

## Destructive Changes To Avoid In Phase 2

Do not do these in the first migration:

- Drop `Project.status`.
- Rename `Project` table to `Job`.
- Rename `Customer` table to `Client`.
- Drop `Project.quantity`, `deliveryDate`, `material`, or `notes`.
- Drop `ProductionEvent`.
- Drop `User.role` values.
- Delete any `ProjectFile` records or storage objects.
- Remove scheduled deletion columns until retention policy is redesigned.

## Controlled Migration Steps

1. [x] Clean `.env.example` and rotate exposed values before touching production.
2. [ ] Capture a database backup.
3. [ ] Determine whether the live database already has migrations not present in source.
4. [x] If there are no migrations, baseline the current schema with a reviewed initial migration or controlled `migrate diff` workflow.
5. [x] Generate the additive Phase 2 migration locally.
6. [x] Review generated SQL manually, especially PostgreSQL enum operations and foreign keys.
7. [ ] Apply to a copied database.
8. [ ] Run backfill script against the copied database.
9. [x] Run lint, type-check, build, and workflow tests.
10. [ ] Only then plan production migration.

Current migration artifact:

- `prisma/migrations/202607051_phase2_workflow_foundation/migration.sql`

This migration has not been applied to production.

## Rollback Notes

Because Phase 2 should be additive, rollback should normally be application-level:

- Stop using new fields/models.
- Revert application code to previous behavior.
- Keep added nullable columns and tables in place until a later cleanup window.

If a migration must be reverted in a non-production environment, drop only the newly added tables, nullable fields, indexes, and enums after confirming no new production data is needed.

## Index Recommendations

Validate with real query patterns, but likely indexes:

- `Project.workflowStatus`
- `Project.expectedCompletionAt`
- `Project.dispatchedAt`
- `Project.customerId`
- `Project.createdById`
- `ActivityLog.projectId, createdAt`
- `ActivityLog.entity, entityId`
- `ShiftSession.employeeId, startedAt`
- `EmployeeSession.employeeId, expiresAt`
- `ProductionRun.projectId`
- `ProductionRun.status`
- `JobProgressUpdate.projectId, createdAt`

## Open Questions

- Should database table names eventually become `Job`, `Client`, and `JobFile`, or should the code use domain names while retaining existing table names?
- Should employees remain in `User` as a role, or move fully to a separate `Employee` model with no email/password login?
- Should completed production files ever be storage-deleted, or only hidden/archived?
- What are the real day/night shift hours and expiration rules?
- What material units does the business actually uses today?
