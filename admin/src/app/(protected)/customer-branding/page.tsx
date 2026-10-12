import type { Metadata } from "next";
import { CustomerBrandingPage } from "@/features/branding/ui/CustomerBrandingPage";

export const metadata: Metadata = {
  title: "Customer Branding — Admin",
  description: "Configure customer marketplace identity, header logo, marketing copy, and theme colors.",
};

export default function CustomerBrandingRoute() {
  return <CustomerBrandingPage />;
}
