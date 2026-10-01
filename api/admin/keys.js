import crypto from "node:crypto";
import { requireAdmin } from "../../lib/auth.js";
import {
  makeKey,
  saveKeyRecord,
  listKeyRecords,
  getKeyRecord,
  deleteKeyRecord,
  resetUsage,
  getUsage
} from "../../lib/keys.js";

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
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === "GET") {
      const records = await listKeyRecords();
      const redis = (await import("../../lib/redis.js")).getRedis();
      const fixed = [];
      for (const record of records) {
        const usage = record.keyHash ? Number((await redis.get("abhinay:usage:" + record.keyHash)) || 0) : 0;
        fixed.push(clean({ ...record, usage }));
      }
      return res.status(200).json({ keys: fixed });
    }

    if (req.method === "POST") {
      const b = body(req);
      const name = String(b.name || "Customer").trim().slice(0, 80);
      const limit = b.limit === "" || b.limit == null ? null : Math.max(1, Number(b.limit));
      const expiresAt = b.expiresAt ? new Date(b.expiresAt).toISOString() : null;
      if (limit !== null && !Number.isFinite(limit)) {
        return res.status(400).json({ error: "Invalid limit" });
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
      return res.status(201).json({ key: rawKey, record: clean(record) });
    }

    if (req.method === "PATCH") {
      const b = body(req);
      if (!b.key) return res.status(400).json({ error: "key required" });
      const record = await getKeyRecord(b.key);
      if (!record) return res.status(404).json({ error: "Key not found" });

      if (b.name !== undefined) record.name = String(b.name).trim().slice(0, 80);
      if (b.limit !== undefined) record.limit = b.limit === null || b.limit === "" ? null : Math.max(1, Number(b.limit));
      if (b.expiresAt !== undefined) record.expiresAt = b.expiresAt ? new Date(b.expiresAt).toISOString() : null;
      if (b.status !== undefined && ["active", "disabled"].includes(b.status)) record.status = b.status;

      await saveKeyRecord(b.key, record);
      if (b.resetUsage) await resetUsage(b.key);
      record.usage = b.resetUsage ? 0 : await getUsage(b.key);
      return res.status(200).json({ record: clean(record) });
    }

    if (req.method === "DELETE") {
      const b = body(req);
      if (!b.key) return res.status(400).json({ error: "key required" });
      await deleteKeyRecord(b.key);
      await resetUsage(b.key);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("admin keys error", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
