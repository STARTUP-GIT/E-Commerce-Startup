import type { Metadata } from "next";
import { LoginPage } from "@/features/auth/ui/LoginPage";

export const metadata: Metadata = {
  title: "Sign In — Marketplace",
  description: "Secure admin login for the marketplace control panel.",
};

export default function LoginRoute() {
  return <LoginPage />;
}
