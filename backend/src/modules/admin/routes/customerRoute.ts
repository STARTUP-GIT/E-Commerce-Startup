import { Router } from "express";
import {
    getCustomers,
    getCustomer,
    banCustomer,
    unbanCustomer,
    deleteCustomer,
    getCustomerOrders,
    getCustomerPayments
} from "../controllers/customerController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = Router();

router.use(adminAuth);

router.get("/customers", requirePermission("customers.view"), getCustomers);
router.get("/customers/:id", requirePermission("customers.view"), getCustomer);
router.patch("/customers/:id/ban", requirePermission("customers.manage"), banCustomer);
router.patch("/customers/:id/unban", requirePermission("customers.manage"), unbanCustomer);
router.delete("/customers/:id", requirePermission("customers.manage"), deleteCustomer);
router.get("/customers/:id/orders", requirePermission("customers.view"), getCustomerOrders);
router.get("/customers/:id/payments", requirePermission("customers.view"), getCustomerPayments);

export default router;
