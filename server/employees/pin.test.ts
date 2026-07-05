import { describe, expect, it } from "vitest";

import { hashEmployeePin, verifyEmployeePin } from "./pin";

describe("employee PIN hashing", () => {
  it("hashes and verifies a valid PIN", async () => {
    const hash = await hashEmployeePin("1234");

    expect(hash).toMatch(/^scrypt:v1:/);
    await expect(verifyEmployeePin("1234", hash)).resolves.toBe(true);
    await expect(verifyEmployeePin("9999", hash)).resolves.toBe(false);
  });

  it("rejects non-numeric PINs", async () => {
    await expect(hashEmployeePin("abcd")).rejects.toThrow("Employee PIN must be 4 to 12 digits.");
  });
});
