import type { Metadata } from "next";
import { OrdersPage } from "@/features/orders/ui/OrdersPage";
export const metadata: Metadata = { title: "Orders — Aura Admin" };
export default function OrdersRoute() { return <OrdersPage />; }
