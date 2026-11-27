"use client";

import React from "react";
import { Truck } from "lucide-react";
import { AdminConversationInbox } from "@/features/conversations/ui/AdminConversationInbox";

export default function DeliveryConversationsPage() {
  return (
    <AdminConversationInbox
      conversationType="DELIVERY_ADMIN"
      title="Delivery Partner Support & Dispatch Conversations"
      subtitle="Real-time rider support messaging, route clarification, order coordination, and priority help desk."
      icon={Truck}
      accentColor="emerald"
    />
  );
}
