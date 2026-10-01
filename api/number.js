import { config } from "../lib/config.js";
import { getApiKey } from "../lib/auth.js";
import { getKeyRecord, incrementUsage } from "../lib/keys.js";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const number = req.query.number;
  const rawKey = getApiKey(req);

  if (!number) return res.status(400).json({ error: "number parameter required" });
  if (!rawKey) return res.status(401).json({ error: "API key required" });

  try {
    const record = await getKeyRecord(rawKey);

    if (!record) return res.status(401).json({ error: "Invalid API key" });
    if (record.status !== "active") return res.status(403).json({ error: "API key disabled" });

    if (record.expiresAt && Date.now() >= new Date(record.expiresAt).getTime()) {
      return res.status(403).json({ error: "API key expired" });
    }

    const usage = Number(record.usage || 0);
    const limit = record.limit == null ? null : Number(record.limit);

    if (limit !== null && usage >= limit) {
      return res.status(429).json({ error: "API request limit reached" });
    }

    const upstreamUrl = `${config.upstream}?number=${encodeURIComponent(number)}`;
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000)
    });

    const body = await upstream.text();

    // Preserve the upstream JSON response exactly as received.
    await incrementUsage(rawKey);

    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    return res.send(body);
  } catch (err) {
    console.error("number endpoint error", err);
    return res.status(502).json({ error: "Upstream request failed" });
  }
}
