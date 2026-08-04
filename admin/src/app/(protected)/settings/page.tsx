import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings/ui/SettingsPage";
export const metadata: Metadata = { title: "Settings — Admin" };
export default function SettingsRoute() { return <SettingsPage />; }
