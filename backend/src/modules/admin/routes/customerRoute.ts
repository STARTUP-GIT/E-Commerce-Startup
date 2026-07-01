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

const router = Router();

router.get("/customers", adminAuth, getCustomers);
router.get("/customers/:id", adminAuth, getCustomer);
router.patch("/customers/:id/ban", adminAuth, banCustomer);
router.patch("/customers/:id/unban", adminAuth, unbanCustomer);
router.delete("/customers/:id", adminAuth, deleteCustomer);
router.get("/customers/:id/orders", adminAuth, getCustomerOrders);
router.get("/customers/:id/payments", adminAuth, getCustomerPayments);

export default router;
