import cron from "node-cron";
import { deleteDeactivatedCustomers } from "./deleteDeactivatedCustomers.js";

cron.schedule("0 0 * * *", async () => {
    await deleteDeactivatedCustomers();
});