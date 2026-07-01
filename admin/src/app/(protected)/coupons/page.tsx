import type { Metadata } from "next";
import { CouponsPage } from "@/features/coupons/ui/CouponsPage";
export const metadata: Metadata = { title: "Coupons — Aura Admin" };
export default function CouponsRoute() { return <CouponsPage />; }
