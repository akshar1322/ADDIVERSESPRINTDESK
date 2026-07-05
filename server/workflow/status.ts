export const jobStatuses = [
  "NEW",
  "IN_PROGRESS",
  "READY_TO_DELIVER",
  "DISPATCHED",
  "ARCHIVED",
  "ON_HOLD",
  "CANCELLED",
] as const;

export type JobStatusValue = (typeof jobStatuses)[number];

const transitions: Record<JobStatusValue, readonly JobStatusValue[]> = {
  NEW: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["READY_TO_DELIVER", "ON_HOLD", "CANCELLED"],
  READY_TO_DELIVER: ["DISPATCHED", "ON_HOLD", "CANCELLED"],
  DISPATCHED: ["ARCHIVED"],
  ARCHIVED: [],
  ON_HOLD: ["NEW", "IN_PROGRESS", "READY_TO_DELIVER", "CANCELLED"],
  CANCELLED: [],
};

export function isJobStatus(value: string): value is JobStatusValue {
  return jobStatuses.includes(value as JobStatusValue);
}

export function getAllowedJobStatusTransitions(status: JobStatusValue) {
  return transitions[status];
}

export function canTransitionJobStatus(from: JobStatusValue, to: JobStatusValue) {
  return transitions[from].includes(to);
}

export function assertValidJobStatusTransition(from: JobStatusValue, to: JobStatusValue) {
  if (!canTransitionJobStatus(from, to)) {
    throw new Error(`Cannot transition job from ${from} to ${to}.`);
  }
}

export function isDispatchedVisibleToEmployees(dispatchedAt: Date | null, now = new Date()) {
  if (!dispatchedAt) {
    return false;
  }

  return now.getTime() - dispatchedAt.getTime() < 24 * 60 * 60 * 1000;
}
