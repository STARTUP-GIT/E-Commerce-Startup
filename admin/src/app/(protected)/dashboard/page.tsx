import type { Metadata } from "next";
import { DashboardPage } from "@/features/dashboard/ui/DashboardPage";

export const metadata: Metadata = {
  title: "Dashboard — Aura Admin",
};

export default function DashboardRoute() {
  return <DashboardPage />;
}
