import type { Metadata } from "next";
import { CustomersPage } from "@/features/customer/ui/CustomersPage";
export const metadata: Metadata = { title: "Customers — Aura Admin" };
export default function CustomersRoute() { return <CustomersPage />; }
