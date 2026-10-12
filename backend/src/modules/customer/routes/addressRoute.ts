import { Router } from "express";
import { customerAuth } from "../../../middleware/customerAuth.js";
import {
    getAddresses,
    getAddressById,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} from "../controllers/addressController.js";

const router = Router();

router.use(customerAuth);

router.get("/", getAddresses);
router.post("/", createAddress);
router.get("/:id", getAddressById);
router.put("/:id", updateAddress);
router.patch("/:id", updateAddress);
router.delete("/:id", deleteAddress);
router.patch("/:id/default", setDefaultAddress);

export default router;
