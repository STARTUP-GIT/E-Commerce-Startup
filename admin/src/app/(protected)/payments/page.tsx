import type { Metadata } from "next";
import { PaymentsPage } from "@/features/payments/ui/PaymentsPage";
export const metadata: Metadata = { title: "Payments — Admin" };
export default function PaymentsRoute() { return <PaymentsPage />; }
