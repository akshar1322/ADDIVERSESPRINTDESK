# Testing

Last updated: 2026-07-05

## Current State

The repository now uses Vitest for focused unit tests.

## Recommended Unit Tests

- Job status transition validation.
- Remaining quantity calculation.
- Material unit normalization.
- Material usage conversion to grams.
- Employee PIN hash and verify behavior.
- 24-hour dispatched employee visibility rule.

## Recommended Integration Tests

- Admin-created job records authenticated admin identity.
- Employee verifies PIN and receives an expiring session.
- Employee starts printing and creates a production run.
- Progress update writes derived remaining quantity.
- Ready-to-deliver requires completion photo.
- Dispatch records employee and shift identity.
- Activity logs are created for workflow mutations.

## Verification Commands

Use these during implementation:

```bash
pnpm prisma validate
pnpm test
pnpm lint
pnpm build
```

## Latest Verification

Completed on 2026-07-05:

- `pnpm prisma validate` passed.
- `pnpm test` passed: 3 files, 9 tests.
- `pnpm lint` passed.
- `pnpm build` passed.
