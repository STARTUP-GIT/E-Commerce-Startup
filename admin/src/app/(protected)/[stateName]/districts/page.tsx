import type { Metadata } from "next";
import { CitiesPage } from "@/features/cities/ui/CitiesPage";

export const metadata: Metadata = { title: "Districts — Aura Admin" };

export default function StateDistrictsRoute() {
  return <CitiesPage />;
}
