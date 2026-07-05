import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;
const prefix = "scrypt:v1";

export async function hashEmployeePin(pin: string) {
  assertValidEmployeePin(pin);

  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(pin, salt, keyLength)) as Buffer;

  return `${prefix}:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyEmployeePin(pin: string, storedHash: string) {
  assertValidEmployeePin(pin);

  const [algorithm, version, salt, hash] = storedHash.split(":");

  if (`${algorithm}:${version}` !== prefix || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = (await scrypt(pin, salt, expected.length)) as Buffer;

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

export function assertValidEmployeePin(pin: string) {
  if (!/^\d{4,12}$/.test(pin)) {
    throw new Error("Employee PIN must be 4 to 12 digits.");
  }
}
