import { requireAdmin } from "../../lib/auth.js";
import { listKeyRecords } from "../../lib/keys.js";
import { getRedis } from "../../lib/redis.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!requireAdmin(req, res)) return;

  try {
    const keys = await listKeyRecords();
    const redis = getRedis();
    const totalUsage = keys.reduce((sum, k) => sum + Number(k.usage || 0), 0);
    const active = keys.filter(k => k.status === "active").length;
    return res.status(200).json({
      totalKeys: keys.length,
      activeKeys: active,
      totalUsage,
      redis: Boolean(redis)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
