import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications/ui/NotificationsPage";
export const metadata: Metadata = { title: "Notifications — Admin" };
export default function NotificationsRoute() { return <NotificationsPage />; }
