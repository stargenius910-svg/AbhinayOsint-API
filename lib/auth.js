import crypto from "node:crypto";
import { config } from "./config.js";

export function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function requireAdmin(req, res) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!config.adminToken || !safeEqual(token, config.adminToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export function getApiKey(req) {
  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return req.headers["x-api-key"] || req.query.key || req.query.slug || bearer || null;
}
