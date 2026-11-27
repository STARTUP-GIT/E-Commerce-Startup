import cron from "node-cron";
import { deleteDeactivatedCustomers } from "./deleteDeactivatedCustomers.js";
import { ShopAvailabilityService } from "../services/shop/shopAvailability.service.js";
import { cleanupExpiredChatMessages, startChatRetentionScheduler } from "../services/chat/chatRetention.service.js";

cron.schedule("0 0 * * *", async () => {
    await deleteDeactivatedCustomers();
    try {
        await cleanupExpiredChatMessages();
    } catch (err) {
        console.error("[CRON] Chat retention cleanup error:", err);
    }
});

// Start chat message 10-day retention background job
startChatRetentionScheduler();

// Run every minute for shop scheduled closings and 30-minute advance countdown notifications
cron.schedule("* * * * *", async () => {
    try {
        await ShopAvailabilityService.processScheduledAvailabilityTick();
    } catch (err) {
        console.error("[CRON] Shop availability scheduler error:", err);
    }
});

// Run immediate catch-up on server start
ShopAvailabilityService.processScheduledAvailabilityTick().catch((err) => {
    console.error("[STARTUP] Shop availability catch-up error:", err);
});
