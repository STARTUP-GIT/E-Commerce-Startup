import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getConversations,
    getConversationDetail,
    sendAdminMessage,
    updateConversationStatus,
    assignConversation,
    updateConversationNotes
} from "../controllers/conversationController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("conversations.view", "support.view"), getConversations);
router.get("/:id", requirePermission("conversations.view", "support.view"), getConversationDetail);
router.post("/:id/messages", requirePermission("conversations.manage", "support.manage"), sendAdminMessage);
router.patch("/:id/status", requirePermission("conversations.manage", "support.manage"), updateConversationStatus);
router.patch("/:id/assign", requirePermission("conversations.manage", "support.manage"), assignConversation);
router.patch("/:id/notes", requirePermission("conversations.manage", "support.manage"), updateConversationNotes);

export default router;
