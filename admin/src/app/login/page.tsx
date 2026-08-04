import type { Metadata } from "next";
import { LoginPage } from "@/features/auth/ui/LoginPage";

export const metadata: Metadata = {
  title: "Sign In — Admin Control Panel",
  description: "Secure admin login for the marketplace control panel.",
};

export default function LoginRoute() {
  return <LoginPage />;
}
