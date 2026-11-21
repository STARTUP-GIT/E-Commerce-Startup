import express from "express";
import { createCity, getCities, updateCity, deleteCity } from "../controllers/cityController.js";
import {
    getDistrictDetails,
    updateDistrictGeneralSettings,
    updateDistrictCustomerSettings,
    updateDistrictSellerSettings,
    updateDistrictDeliverySettings,
    updateDistrictLaunchConfig,
    listCityTowns,
    createCityTown,
    updateCityTown,
    deleteCityTown,
    listServiceAreas,
    createServiceArea,
    updateServiceArea,
    deleteServiceArea,
    getDistrictRequests,
    getDistrictAuditLogs
} from "../controllers/districtDetailController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = express.Router();

router.use(adminAuth);

// Basic District CRUD
router.post("/", requirePermission("catalog.manage"), createCity);
router.get("/", requirePermission("catalog.view"), getCities);
router.put("/:id", requirePermission("catalog.manage"), updateCity);
router.delete("/:id", requirePermission("catalog.manage"), deleteCity);

// Detailed District Management (Tabs)
router.get("/:id/details", requirePermission("catalog.view"), getDistrictDetails);
router.put("/:id/general-settings", requirePermission("catalog.manage"), updateDistrictGeneralSettings);
router.put("/:id/customer-settings", requirePermission("catalog.manage"), updateDistrictCustomerSettings);
router.put("/:id/seller-settings", requirePermission("catalog.manage"), updateDistrictSellerSettings);
router.put("/:id/delivery-settings", requirePermission("catalog.manage"), updateDistrictDeliverySettings);
router.put("/:id/launch-config", requirePermission("catalog.manage"), updateDistrictLaunchConfig);

// Child Cities / Towns
router.get("/:id/towns", requirePermission("catalog.view"), listCityTowns);
router.post("/:id/towns", requirePermission("catalog.manage"), createCityTown);
router.put("/:id/towns/:townId", requirePermission("catalog.manage"), updateCityTown);
router.delete("/:id/towns/:townId", requirePermission("catalog.manage"), deleteCityTown);

// Child Service Areas
router.get("/:id/service-areas", requirePermission("catalog.view"), listServiceAreas);
router.post("/:id/service-areas", requirePermission("catalog.manage"), createServiceArea);
router.put("/:id/service-areas/:areaId", requirePermission("catalog.manage"), updateServiceArea);
router.delete("/:id/service-areas/:areaId", requirePermission("catalog.manage"), deleteServiceArea);

// Requests & Audit Trail
router.get("/:id/requests", requirePermission("catalog.view"), getDistrictRequests);
router.get("/:id/audit-logs", requirePermission("catalog.view"), getDistrictAuditLogs);

export default router;
