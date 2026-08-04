import type { Metadata } from "next";
import { DashboardPage } from "@/features/dashboard/ui/DashboardPage";

export const metadata: Metadata = {
  title: "Dashboard — Admin",
  description: "Enterprise administration control panel dashboard.",
};

export default function DashboardRoute() {
  return <DashboardPage />;
}
