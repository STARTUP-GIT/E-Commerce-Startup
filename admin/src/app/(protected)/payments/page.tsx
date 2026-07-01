import type { Metadata } from "next";
import { PaymentsPage } from "@/features/payments/ui/PaymentsPage";
export const metadata: Metadata = { title: "Payments — Aura Admin" };
export default function PaymentsRoute() { return <PaymentsPage />; }
