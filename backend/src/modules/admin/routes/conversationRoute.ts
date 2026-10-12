import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getAdminUnreadCounts,
    getConversations,
    getConversationDetail,
    markConversationRead,
    sendAdminMessage,
    updateConversationStatus,
    assignConversation,
    updateConversationNotes
} from "../controllers/conversationController.js";

const router = Router();

router.use(adminAuth);

router.get("/unread-counts", requirePermission("conversations.view", "support.view"), getAdminUnreadCounts);
router.get("/", requirePermission("conversations.view", "support.view"), getConversations);
router.get("/:id", requirePermission("conversations.view", "support.view"), getConversationDetail);
router.post("/:id/read", requirePermission("conversations.view", "support.view"), markConversationRead);
router.post("/:id/messages", requirePermission("conversations.manage", "support.manage"), sendAdminMessage);
router.patch("/:id/status", requirePermission("conversations.manage", "support.manage"), updateConversationStatus);
router.patch("/:id/assign", requirePermission("conversations.manage", "support.manage"), assignConversation);
router.patch("/:id/notes", requirePermission("conversations.manage", "support.manage"), updateConversationNotes);

export default router;
