import crypto from "node:crypto";
import { getRedis } from "./redis.js";

const KEY_PREFIX = "abhinay:key:";
const INDEX_KEY = "abhinay:keys";

export function hashKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function makeKey() {
  return "abn_live_" + crypto.randomBytes(24).toString("base64url");
}

export async function getKeyRecord(rawKey) {
  if (!rawKey) return null;
  return getRedis().get(KEY_PREFIX + hashKey(rawKey));
}

export async function saveKeyRecord(rawKey, record) {
  const redis = getRedis();
  const id = hashKey(rawKey);
  record.keyHash = id;
  await redis.set(KEY_PREFIX + id, record);
  await redis.sadd(INDEX_KEY, id);
  return id;
}

export async function deleteKeyRecord(rawKey) {
  const redis = getRedis();
  const id = hashKey(rawKey);
  await redis.del(KEY_PREFIX + id);
  await redis.srem(INDEX_KEY, id);
}

export async function listKeyRecords() {
  const redis = getRedis();
  const ids = await redis.smembers(INDEX_KEY);
  if (!ids?.length) return [];
  const values = await redis.mget(...ids.map(id => KEY_PREFIX + id));
  return values.filter(Boolean);
}

export async function incrementUsage(rawKey) {
  const redis = getRedis();
  return redis.incr("abhinay:usage:" + hashKey(rawKey));
}

export async function getUsage(rawKey) {
  return (await getRedis().get("abhinay:usage:" + hashKey(rawKey))) || 0;
}

export async function resetUsage(rawKey) {
  await getRedis().del("abhinay:usage:" + hashKey(rawKey));
}
