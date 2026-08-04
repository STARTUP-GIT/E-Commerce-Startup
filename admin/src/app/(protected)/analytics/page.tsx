import type { Metadata } from "next";
import { AnalyticsPage } from "@/features/analytics/ui/AnalyticsPage";
export const metadata: Metadata = { title: "Analytics — Admin" };
export default function AnalyticsRoute() { return <AnalyticsPage />; }
