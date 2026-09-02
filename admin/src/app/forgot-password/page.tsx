import type { Metadata } from "next";
import { ForgotPasswordPage } from "@/features/auth/ui/ForgotPasswordPage";

export const metadata: Metadata = {
  title: "Reset Password — Marketplace",
  description: "Reset your admin account password.",
};

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}
