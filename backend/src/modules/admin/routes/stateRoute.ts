import { Router } from "express";
import {
    createState,
    getStates,
    updateState,
    deleteState
} from "../controllers/stateController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = Router();

router.post("/", adminAuth, createState);
router.get("/", adminAuth, getStates);
router.put("/:id", adminAuth, updateState);
router.delete("/:id", adminAuth, deleteState);

export default router;
