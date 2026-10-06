import type { Metadata } from "next";
import { ModerationPage } from "@/features/moderation/ui/ModerationPage";
export const metadata: Metadata = { title: "Moderation — Admin" };
export default function ModerationRoute() { return <ModerationPage />; }
