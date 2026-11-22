import type { Metadata } from "next";
import { AcceptInvitationPage } from "@/features/auth/ui/AcceptInvitationPage";

export const metadata: Metadata = {
  title: "Accept Admin Invitation — AtlasBasket",
  description: "Accept your administrator invitation and configure your credentials.",
};

export default function AcceptInvitationRoute() {
  return <AcceptInvitationPage />;
}
