import cron from "node-cron";
import { deleteDeactivatedCustomers } from "./deleteDeactivatedCustomers.js";
import { migrateProductDeliveryMethods } from "./migrateProductDeliveryMethods.js";

// Run initial migration check on startup
migrateProductDeliveryMethods().catch(console.error);

cron.schedule("0 0 * * *", async () => {
    await deleteDeactivatedCustomers();
});