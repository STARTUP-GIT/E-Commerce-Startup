import { Router } from "express";
import { getWebhooks, addWebhook, patchWebhook, removeWebhook } from "../controllers/webhookController.js";
import { platformAuth, requirePermission } from "../middleware/platformAuth.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

router.get("/", platformAuth, requirePermission(PERMISSIONS.WEBHOOKS_MANAGE), getWebhooks);
router.post("/", platformAuth, requirePermission(PERMISSIONS.WEBHOOKS_MANAGE), addWebhook);
router.patch("/:id", platformAuth, requirePermission(PERMISSIONS.WEBHOOKS_MANAGE), patchWebhook);
router.delete("/:id", platformAuth, requirePermission(PERMISSIONS.WEBHOOKS_MANAGE), removeWebhook);

export default router;
