import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getTickets,
    getTicket,
    addTicketMessage,
    updateTicket
} from "../controllers/supportTicketController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("support.view"), getTickets);
router.get("/:id", requirePermission("support.view"), getTicket);
router.post("/:id/messages", requirePermission("support.manage"), addTicketMessage);
router.patch("/:id", requirePermission("support.manage"), updateTicket);

export default router;
