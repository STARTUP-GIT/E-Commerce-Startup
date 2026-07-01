import type { Metadata } from "next";
import { SellersPage } from "@/features/seller/ui/SellersPage";

export const metadata: Metadata = { title: "Sellers — Aura Admin" };

export default function SellersRoute() {
  return <SellersPage />;
}
