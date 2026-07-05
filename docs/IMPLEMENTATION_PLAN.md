# Implementation Plan

Audit date: 2026-07-05

## Current Recommendation

Proceed incrementally. The existing app has useful foundations, but the target product requires a clear split between authenticated admin operations and verified employee shift work. Phase 2 should build the database foundation without destructive renames or UI redesign.

## Phase 1 Status

Completed by this document set:

- Repository structure inspected.
- `package.json` inspected.
- Prisma schema/config inspected.
- Better Auth setup inspected.
- Routes, API handlers, server actions, and auth helpers inspected.
- Existing admin and employee-adjacent UI inspected.
- File upload/storage logic inspected.
- 3D preview functionality checked.
- Activity, printer, project, production, and user models inspected.
- Reusable code and migration risks identified.

No redesign implementation has been started.

## Phase 2 Implementation Checklist

Before coding Phase 2:

- [x] Scrub `.env.example` and rotate exposed credentials.
- [x] Decide whether to keep database table names as `Project`/`Customer` for now.
- [x] Create or baseline Prisma migrations.
- [x] Confirm target workflow enum names.
- [x] Confirm employee PIN hashing strategy.
- [x] Confirm shift defaults.

Phase 2 coding tasks:

1. [x] Update `prisma/schema.prisma` additively.
2. [x] Generate a Prisma migration and review SQL.
3. [x] Add domain constants and validation utilities for workflow transitions.
4. [x] Add backfill script for existing projects, files, material types, and activity actor types.
5. [x] Regenerate Prisma client.
6. [x] Add focused unit tests once a test runner is selected or configured.
7. [x] Run `pnpm lint`, TypeScript/build checks, and Prisma validation.

## Phase 2 Status

Completed on 2026-07-05:

- Added additive workflow schema foundation without renaming or dropping existing tables.
- Added employee verification, shift, production run, progress update, photo, delivery, handover, material, and extended activity models.
- Generated review migration SQL at `prisma/migrations/202607051_phase2_workflow_foundation/migration.sql`.
- Regenerated the Prisma client.
- Added workflow validation, status transition, employee PIN, and activity logging helpers.
- Added a workflow foundation backfill script.
- Scrubbed `.env.example` and added environment, workflow, and testing docs.
- Added Vitest and focused unit tests.

Verification:

- `pnpm prisma validate` passed.
- `pnpm test` passed: 3 files, 9 tests.
- `pnpm lint` passed.
- `pnpm build` passed.

Note: The migration SQL has been generated for review but has not been applied to production.

## Recommended Phase 2 Files To Change

Exact files recommended for Phase 2:

- `prisma/schema.prisma`
- `prisma.config.ts` only if migration setup needs adjustment
- `.env.example`
- `lib/prisma.ts` only if generated client import path changes
- `server/authz.ts`
- `lib/session.ts`
- `server/workflow/status.ts` new
- `server/workflow/validation.ts` new
- `server/employees/pin.ts` new
- `server/activity/log.ts` new
- `scripts/backfill-workflow-foundation.mjs` new
- `docs/ENVIRONMENT_VARIABLES.md` new or updated
- `docs/WORKFLOW_RULES.md` new
- `docs/TESTING.md` new or updated

Generated after Prisma work:

- `prisma/migrations/...`
- `app/generated/prisma/...`

## Phase 3 Admin Foundation

Goals:

- Introduce `/admin` route group.
- Protect admin routes with authenticated admin role checks.
- Move or wrap current admin pages into `/admin`.
- Replace `/projects` with admin job management.
- Implement client management.
- Implement multi-section job creation.
- Save creator admin identity from session.
- Integrate file uploads into job create/detail flow.

### Phase 3 Status

- [x] Introduce `/admin` route group.
- [x] Protect admin routes with authenticated admin role checks.
- [x] Add admin shell navigation.
- [x] Scaffold core admin routes under `/admin`.
- [x] Replace root admin pages with `/admin` links.
- [ ] Implement client management.
- [ ] Implement multi-section job creation.
- [ ] Save creator admin identity from session.
- [ ] Integrate file uploads into job create/detail flow.

Legacy app pages now redirect into the new `/admin` tree, so the old dashboard/project/user surface is effectively retired.

Reuse:

- Existing auth/session helpers.
- Existing UI primitives.
- Existing `Users` and `Projects` server-action patterns after validation cleanup.
- Existing storage abstraction.

## Phase 4 Employee Verification And Shell

Goals:

- Introduce `/work` route group.
- Build employee selection and PIN verification.
- Create employee session and shift session server-side.
- Add employee route/API protection separate from Better Auth admin sessions.
- Build three primary tabs: New Work, In Progress, Ready to Deliver.

Important constraint:

- Employees should not use the existing email/password sign-in page for the work portal.

### Phase 4 Status

- [x] Introduce `/work` route group.
- [x] Build employee selection and PIN verification UI.
- [x] Build the three primary tabs: New Work, In Progress, Ready to Deliver.
- [x] Make the employee workspace visible in the app.
- [x] Create employee session and shift session server-side.
- [ ] Add employee route/API protection separate from Better Auth admin sessions.
- [x] Persist verified employee identity across requests.
- [x] Wire work actions to real job data.

## Phase 5 New Work

Goals:

- Query `NEW` jobs.
- Show touch-friendly job cards.
- Add details drawer/modal.
- Add file previews/downloads.
- Add lazy 3D preview for supported formats.
- Implement Start Printing transaction:
  - Validate employee session.
  - Validate printer.
  - Create production run.
  - Set status to `IN_PROGRESS`.
  - Record timestamps, employee, shift, and activity.

## Phase 6 In Progress

Goals:

- Show active production runs/jobs.
- Update printed quantity, printer assignment, material usage, and notes.
- Derive remaining quantity from required minus printed.
- Log every meaningful update.
- Prevent invalid quantity/material states.

## Phase 7 Shift Handover

Goals:

- Resolve current shift from definitions.
- Show handover summary for continuing jobs.
- Accept handover with note.
- Record previous and incoming employee/shift context.

## Phase 8 Ready To Deliver

Goals:

- Require completion photo upload before ready transition.
- Store photo metadata.
- Generate honest WhatsApp handoff URL/message.
- Require employee confirmation of notification.
- Mark job `READY_TO_DELIVER`.
- Implement dispatch transaction.
- Hide dispatched jobs from employee workspace after 24 hours while retaining data.

## Phase 9 Admin Dashboard

Goals:

- Replace static dashboard data with database queries.
- Add KPIs, running jobs, due soon, overdue, active printers, active employees, active shift, materials in use, ready queue, and recent activity.
- Paginate activity/history where needed.

## Phase 10 Hardening

Goals:

- Authorization audit.
- Validation audit.
- File access audit.
- Rate limiting for employee PIN attempts.
- Performance review and indexes.
- Responsive and accessibility checks.
- Production build.
- Deployment documentation.
- Critical workflow tests.

## Reuse Plan

Keep and refactor:

- Better Auth for admin authentication.
- Prisma/Postgres setup.
- User management page logic for admin staff management.
- `Customer`, `Project`, `ProjectFile`, `Printer`, `ActivityLog` data as migration base.
- Storage provider abstraction.
- UI primitives and admin layout styling.
- Vercel cron structure, after retention rules are corrected.

Replace or redesign:

- Employee access through standard login.
- Static dashboard.
- Placeholder modules.
- Manual project ID upload panel.
- Delete/scheduled-delete production job UX.
- Manual input parsing with shared validation.

## Validation And Testing Plan

Add tests around:

- Workflow status transition validation.
- Remaining quantity calculation.
- Material unit normalization.
- Employee session expiration.
- 24-hour dispatched visibility rule.
- Admin permission checks.
- Employee permission checks.
- Start printing transaction.
- Progress update transaction.
- Ready-to-deliver transaction.
- Dispatch transaction.

The repository currently has no explicit test script. Add a test runner before implementing broad workflow logic.

## Stop Point

Stop after Phase 1 documents are reviewed. Do not begin Phase 2 until the database migration approach and table naming strategy are approved.
