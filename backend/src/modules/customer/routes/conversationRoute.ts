import { Router } from "express";
import { customerAuth } from "../../../middleware/customerAuth.js";
import {
    getCustomerConversations,
    startCustomerConversation,
    getCustomerConversationMessages,
    sendCustomerMessage,
    markCustomerConversationRead
} from "../controllers/conversationController.js";

const router = Router();

router.use(customerAuth);

router.get("/", getCustomerConversations);
router.post("/", startCustomerConversation);
router.get("/:id/messages", getCustomerConversationMessages);
router.post("/:id/messages", sendCustomerMessage);
router.post("/:id/read", markCustomerConversationRead);

export default router;
