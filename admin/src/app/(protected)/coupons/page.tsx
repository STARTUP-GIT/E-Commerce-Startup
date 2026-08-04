import type { Metadata } from "next";
import { CouponsPage } from "@/features/coupons/ui/CouponsPage";
export const metadata: Metadata = { title: "Coupons — Admin" };
export default function CouponsRoute() { return <CouponsPage />; }
