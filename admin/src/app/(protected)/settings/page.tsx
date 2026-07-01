import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings/ui/SettingsPage";
export const metadata: Metadata = { title: "Settings — Aura Admin" };
export default function SettingsRoute() { return <SettingsPage />; }
