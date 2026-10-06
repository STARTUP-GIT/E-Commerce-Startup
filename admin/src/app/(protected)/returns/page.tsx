import type { Metadata } from "next";
import { ReturnsPage } from "@/features/returns/ui/ReturnsPage";
export const metadata: Metadata = { title: "Returns — Admin" };
export default function ReturnsRoute() { return <ReturnsPage />; }
