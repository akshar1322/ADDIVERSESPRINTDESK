# Workflow Rules

Last updated: 2026-07-05

## Job Statuses

The server-controlled workflow statuses are:

- `NEW`
- `IN_PROGRESS`
- `READY_TO_DELIVER`
- `DISPATCHED`
- `ARCHIVED`
- `ON_HOLD`
- `CANCELLED`

## Allowed Transitions

- `NEW` -> `IN_PROGRESS`, `ON_HOLD`, `CANCELLED`
- `IN_PROGRESS` -> `READY_TO_DELIVER`, `ON_HOLD`, `CANCELLED`
- `READY_TO_DELIVER` -> `DISPATCHED`, `ON_HOLD`, `CANCELLED`
- `DISPATCHED` -> `ARCHIVED`
- `ON_HOLD` -> `NEW`, `IN_PROGRESS`, `READY_TO_DELIVER`, `CANCELLED`
- `ARCHIVED` and `CANCELLED` are terminal unless a future admin-only recovery policy is approved.

## Quantity Rules

- Required quantity is admin-controlled.
- Printed quantity must be a non-negative whole number.
- Printed quantity cannot exceed required quantity unless a future admin policy explicitly allows overproduction.
- Remaining quantity is derived as `requiredQuantity - printedQuantity`.

## Employee Session Rules

- Employees verify through employee selection plus PIN.
- Employee PINs are hashed with a salted scrypt hash.
- Employee sessions must expire.
- Shift context must be recorded for workflow mutations.

## Dispatch Visibility

- Dispatched jobs remain visible in the employee workspace for 24 hours.
- After 24 hours, they are hidden from employees.
- Jobs and history are never automatically deleted.
- Admins can continue to search historical jobs.

## Activity Rules

Every important mutation should create an activity log with:

- Actor type: `ADMIN`, `EMPLOYEE`, or `SYSTEM`
- Actor identity when available
- Job/project reference when available
- Shift session reference when available
- Action name
- Server timestamp
- Non-sensitive metadata only
