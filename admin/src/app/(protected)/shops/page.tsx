import type { Metadata } from "next";
import { ShopsPage } from "@/features/shops/ui/ShopsPage";
export const metadata: Metadata = { title: "Shops — Aura Admin" };
export default function ShopsRoute() { return <ShopsPage />; }
