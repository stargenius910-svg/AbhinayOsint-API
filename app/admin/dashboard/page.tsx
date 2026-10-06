import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import DashboardClient from "./ui";

export default async function Dashboard() {
  try { await requireAdmin(); }
  catch { redirect("/admin/login"); }
  return <DashboardClient />;
}