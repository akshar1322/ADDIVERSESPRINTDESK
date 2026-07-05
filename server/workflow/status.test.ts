import { describe, expect, it } from "vitest";

import {
  assertValidJobStatusTransition,
  canTransitionJobStatus,
  isDispatchedVisibleToEmployees,
} from "./status";

describe("workflow status rules", () => {
  it("allows the main production path", () => {
    expect(canTransitionJobStatus("NEW", "IN_PROGRESS")).toBe(true);
    expect(canTransitionJobStatus("IN_PROGRESS", "READY_TO_DELIVER")).toBe(true);
    expect(canTransitionJobStatus("READY_TO_DELIVER", "DISPATCHED")).toBe(true);
    expect(canTransitionJobStatus("DISPATCHED", "ARCHIVED")).toBe(true);
  });

  it("rejects invalid jumps", () => {
    expect(() => assertValidJobStatusTransition("NEW", "DISPATCHED")).toThrow(
      "Cannot transition job from NEW to DISPATCHED.",
    );
  });

  it("keeps dispatched jobs employee-visible for less than 24 hours", () => {
    const now = new Date("2026-07-05T12:00:00.000Z");

    expect(isDispatchedVisibleToEmployees(new Date("2026-07-04T12:00:01.000Z"), now)).toBe(true);
    expect(isDispatchedVisibleToEmployees(new Date("2026-07-04T12:00:00.000Z"), now)).toBe(false);
  });
});
