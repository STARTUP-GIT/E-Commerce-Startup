import { Router } from "express";
import { customerAuth } from "../../../middleware/customerAuth.js";
import {
    createCustomerReport,
    getMyCustomerReports
} from "../controllers/reportController.js";

const router = Router();

router.use(customerAuth);

router.post("/", createCustomerReport);
router.get("/", getMyCustomerReports);

export default router;
