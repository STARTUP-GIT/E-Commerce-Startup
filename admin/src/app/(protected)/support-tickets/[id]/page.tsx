import type { Metadata } from "next";
import { SupportTicketDetailPage } from "@/features/support-tickets/ui/SupportTicketDetailPage";
export const metadata: Metadata = { title: "Support Ticket — Admin" };
export default function SupportTicketDetailRoute() { return <SupportTicketDetailPage />; }
