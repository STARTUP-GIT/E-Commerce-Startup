"use client";

import React from "react";
import { MessageSquare } from "lucide-react";
import { AdminConversationInbox } from "@/features/conversations/ui/AdminConversationInbox";

export default function CustomerConversationsPage() {
  return (
    <AdminConversationInbox
      conversationType="CUSTOMER_ADMIN"
      title="Customer Real-Time Conversations"
      subtitle="Durable customer support messaging with read receipts and confidential agent internal notes."
      icon={MessageSquare}
      accentColor="indigo"
    />
  );
}
