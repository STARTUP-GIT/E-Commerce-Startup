import type { Metadata } from "next";
import { DeliveryPage } from "@/features/delivery/ui/DeliveryPage";
export const metadata: Metadata = { title: "Delivery — Aura Admin" };
export default function DeliveryRoute() { return <DeliveryPage />; }
