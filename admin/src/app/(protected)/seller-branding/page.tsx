import type { Metadata } from "next";
import { SellerBrandingPage } from "@/features/branding/ui/SellerBrandingPage";

export const metadata: Metadata = {
  title: "Seller Branding — Admin",
  description: "Configure seller portal workspace identity, sidebar logo, auth screen headers, theme colors, and portal metadata.",
};

export default function SellerBrandingRoute() {
  return <SellerBrandingPage />;
}
