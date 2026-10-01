import crypto from "node:crypto";
import { requireAdmin } from "../../lib/auth.js";
import { getRedis } from "../../lib/redis.js";
import {
  makeKey,
  saveKeyRecord,
  listKeyRecords,
  getKeyRecord,
  deleteKeyRecord,
  resetUsage,
  getUsage
} from "../../lib/keys.js";

const KEY_PREFIX = "abhinay:key:";
const INDEX_KEY = "abhinay:keys";

function clean(record) {
  return {
    id: record.id,
    name: record.name,
    limit: record.limit,
    expiresAt: record.expiresAt,
    status: record.status,
    createdAt: record.createdAt,
    usage: Number(record.usage || 0)
  };
}

function body(req) {
  try {
    return typeof req.body === "string"
      ? JSON.parse(req.body || "{}")
      : (req.body || {});
  } catch {
    return {};
  }
}

async function findRecordById(id) {
  if (!id) return null;

  const records = await listKeyRecords();
  return records.find(record => record.id === id) || null;
}

async function saveRecordById(record) {
  if (!record?.keyHash) {
    throw new Error("Key hash missing");
  }

  const redis = getRedis();
  await redis.set(KEY_PREFIX + record.keyHash, record);
  await redis.sadd(INDEX_KEY, record.keyHash);

  return record;
}

async function deleteRecordById(record) {
  if (!record?.keyHash) {
    throw new Error("Key hash missing");
  }

  const redis = getRedis();

  await redis.del(KEY_PREFIX + record.keyHash);
  await redis.srem(INDEX_KEY, record.keyHash);
  await redis.del("abhinay:usage:" + record.keyHash);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (!requireAdmin(req, res)) return;

  try {
    /*
     * GET
     * List all API keys with live usage.
     */
    if (req.method === "GET") {
      const records = await listKeyRecords();
      const redis = getRedis();

      const fixed = [];

      for (const record of records) {
        const usage = record.keyHash
          ? Number(
              (await redis.get("abhinay:usage:" + record.keyHash)) || 0
            )
          : 0;

        fixed.push(
          clean({
            ...record,
            usage
          })
        );
      }

      return res.status(200).json({
        keys: fixed
      });
    }

    /*
     * POST
     * Create a new API key.
     */
    if (req.method === "POST") {
      const b = body(req);

      const name = String(b.name || "Customer")
        .trim()
        .slice(0, 80);

      const limit =
        b.limit === "" || b.limit == null
          ? null
          : Math.max(1, Number(b.limit));

      if (limit !== null && !Number.isFinite(limit)) {
        return res.status(400).json({
          error: "Invalid limit"
        });
      }

      let expiresAt = null;

      if (b.expiresAt) {
        const date = new Date(b.expiresAt);

        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({
            error: "Invalid expiry date"
          });
        }

        expiresAt = date.toISOString();
      }

      const rawKey = makeKey();

      const record = {
        id: crypto.randomUUID(),
        name,
        limit,
        expiresAt,
        status: "active",
        createdAt: new Date().toISOString(),
        usage: 0
      };

      await saveKeyRecord(rawKey, record);

      return res.status(201).json({
        key: rawKey,
        record: clean(record)
      });
    }

    /*
     * PATCH
     *
     * Preferred:
     * { "id": "...", "status": "disabled" }
     *
     * Also supports the old raw-key method:
     * { "key": "...", "status": "disabled" }
     */
    if (req.method === "PATCH") {
      const b = body(req);

      let record = null;

      if (b.id) {
        record = await findRecordById(String(b.id));
      } else if (b.key) {
        record = await getKeyRecord(String(b.key));
      }

      if (!record) {
        return res.status(404).json({
          error: "Key not found"
        });
      }

      if (b.name !== undefined) {
        record.name = String(b.name)
          .trim()
          .slice(0, 80);
      }

      if (b.limit !== undefined) {
        if (b.limit === null || b.limit === "") {
          record.limit = null;
        } else {
          const newLimit = Math.max(1, Number(b.limit));

          if (!Number.isFinite(newLimit)) {
            return res.status(400).json({
              error: "Invalid limit"
            });
          }

          record.limit = newLimit;
        }
      }

      if (b.expiresAt !== undefined) {
        if (!b.expiresAt) {
          record.expiresAt = null;
        } else {
          const date = new Date(b.expiresAt);

          if (Number.isNaN(date.getTime())) {
            return res.status(400).json({
              error: "Invalid expiry date"
            });
          }

          record.expiresAt = date.toISOString();
        }
      }

      if (b.status !== undefined) {
        if (!["active", "disabled"].includes(b.status)) {
          return res.status(400).json({
            error: "Invalid status"
          });
        }

        record.status = b.status;
      }

      await saveRecordById(record);

      if (b.resetUsage) {
        await resetUsageByHash(record.keyHash);
      }

      record.usage = b.resetUsage
        ? 0
        : await getUsageByHash(record.keyHash);

      return res.status(200).json({
        record: clean(record)
      });
    }

    /*
     * DELETE
     *
     * Preferred:
     * { "id": "..." }
     *
     * Also supports:
     * { "key": "..." }
     */
    if (req.method === "DELETE") {
      const b = body(req);

      let record = null;

      if (b.id) {
        record = await findRecordById(String(b.id));
      } else if (b.key) {
        record = await getKeyRecord(String(b.key));
      }

      if (!record) {
        return res.status(404).json({
          error: "Key not found"
        });
      }

      await deleteRecordById(record);

      return res.status(200).json({
        ok: true
      });
    }

    return res.status(405).json({
      error: "Method not allowed"
    });
  } catch (err) {
    console.error("admin keys error", err);

    return res.status(500).json({
      error: err.message || "Server error"
    });
  }
}

/*
 * Usage helpers using the stored keyHash.
 * The raw API key is never required.
 */
async function getUsageByHash(keyHash) {
  if (!keyHash) return 0;

  const redis = getRedis();

  return Number(
    (await redis.get("abhinay:usage:" + keyHash)) || 0
  );
}

async function resetUsageByHash(keyHash) {
  if (!keyHash) return;

  const redis = getRedis();

  await redis.del("abhinay:usage:" + keyHash);
            }
