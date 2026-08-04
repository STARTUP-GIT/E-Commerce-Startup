import type { Metadata } from "next";
import { AuditLogsPage } from "@/features/audit-logs/ui/AuditLogsPage";
export const metadata: Metadata = { title: "Audit Logs — Admin" };
export default function AuditLogsRoute() { return <AuditLogsPage />; }
