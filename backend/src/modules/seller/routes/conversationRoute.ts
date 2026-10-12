import { Router } from "express";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import {
    getSellerConversations,
    startSellerConversation,
    getSellerConversationMessages,
    sendSellerMessage,
    markSellerConversationRead
} from "../controllers/conversationController.js";

const router = Router();

router.use(sellerAuth);

router.get("/", getSellerConversations);
router.post("/", startSellerConversation);
router.get("/:id", getSellerConversationMessages);
router.get("/:id/messages", getSellerConversationMessages);
router.post("/:id/messages", sendSellerMessage);
router.post("/:id/read", markSellerConversationRead);

export default router;
