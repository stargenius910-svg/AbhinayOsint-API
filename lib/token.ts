import crypto from "crypto";

export function randomPublicId() {
  return crypto.randomBytes(9).toString("base64url");
}