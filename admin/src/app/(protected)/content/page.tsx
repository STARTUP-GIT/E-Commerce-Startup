import type { Metadata } from "next";
import { ContentPage } from "@/features/content/ui/ContentPage";
export const metadata: Metadata = { title: "Content — Admin" };
export default function ContentRoute() { return <ContentPage />; }