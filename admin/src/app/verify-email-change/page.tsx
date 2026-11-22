import type { Metadata } from "next";
import { VerifyEmailChangePage } from "@/features/auth/ui/VerifyEmailChangePage";

export const metadata: Metadata = {
  title: "Verify Admin Email Change — AtlasBasket",
  description: "Verify your new administrator email address.",
};

export default function VerifyEmailChangeRoute() {
  return <VerifyEmailChangePage />;
}
