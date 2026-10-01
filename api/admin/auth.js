import { requireAdmin } from "../../lib/auth.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!requireAdmin(req, res)) return;
  return res.status(200).json({ ok: true });
}
