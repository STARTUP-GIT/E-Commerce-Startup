import type { Metadata } from "next";
import { SupportTicketsPage } from "@/features/support-tickets/ui/SupportTicketsPage";
export const metadata: Metadata = { title: "Support Tickets — Admin" };
export default function SupportTicketsRoute() { return <SupportTicketsPage />; }
