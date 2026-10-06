import type { Metadata } from "next";
import { RolesPage } from "@/features/roles/ui/RolesPage";
export const metadata: Metadata = { title: "Roles & Permissions — Admin" };
export default function RolesRoute() { return <RolesPage />; }