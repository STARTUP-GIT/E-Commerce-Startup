"use client";

import React from "react";
import { Store } from "lucide-react";
import { AdminConversationInbox } from "@/features/conversations/ui/AdminConversationInbox";

export default function SellerConversationsPage() {
  return (
    <AdminConversationInbox
      conversationType="SELLER_ADMIN"
      title="Seller Real-Time Support & Dispute Conversations"
      subtitle="Durable merchant messaging, clarification on statements, disputes, and policy guidelines."
      icon={Store}
      accentColor="purple"
    />
  );
}
