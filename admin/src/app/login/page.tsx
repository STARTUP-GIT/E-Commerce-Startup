import type { Metadata } from "next";
import { LoginPage } from "@/features/auth/ui/LoginPage";

export const metadata: Metadata = {
  title: "Sign In — Aura Admin",
  description: "Secure admin login for the Aura marketplace control panel.",
};

export default function LoginRoute() {
  return <LoginPage />;
}
