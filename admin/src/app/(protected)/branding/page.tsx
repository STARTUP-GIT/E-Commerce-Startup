import type { Metadata } from "next";
import { BrandingPage } from "@/features/branding/ui/BrandingPage";
export const metadata: Metadata = { title: "Branding — Admin" };
export default function BrandingRoute() { return <BrandingPage />; }