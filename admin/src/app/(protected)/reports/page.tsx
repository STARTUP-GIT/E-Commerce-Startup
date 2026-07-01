import type { Metadata } from "next";
import { ReportsPage } from "@/features/reports/ui/ReportsPage";
export const metadata: Metadata = { title: "Reports — Aura Admin" };
export default function ReportsRoute() { return <ReportsPage />; }
