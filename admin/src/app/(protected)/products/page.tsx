import type { Metadata } from "next";
import { ProductsPage } from "@/features/products/ui/ProductsPage";
export const metadata: Metadata = { title: "Products — Aura Admin" };
export default function ProductsRoute() { return <ProductsPage />; }
