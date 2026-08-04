import type { Metadata } from "next";
import { CitiesPage } from "@/features/cities/ui/CitiesPage";

export const metadata: Metadata = { title: "Districts — Admin" };

export default function StateDistrictsRoute() {
  return <CitiesPage />;
}
