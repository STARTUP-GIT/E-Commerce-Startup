import type { Metadata } from "next";
import { PackingFeeRequestsPage } from "@/features/shops/ui/PackingFeeRequestsPage";

export const metadata: Metadata = { title: "Packing Fee Requests — Admin" };

export default function PackingFeeRequestsRoute() {
  return <PackingFeeRequestsPage />;
}
