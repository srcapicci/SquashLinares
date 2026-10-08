import {
  scrypt as scryptCb,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCb);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return salt + ":" + key.toString("hex");
}
export async function checkPassword(password, hash) {
  const [salt, hex] = hash.split(":");
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const actual = await scrypt(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}
export function newToken() {
  return randomBytes(32).toString("base64url");
}
