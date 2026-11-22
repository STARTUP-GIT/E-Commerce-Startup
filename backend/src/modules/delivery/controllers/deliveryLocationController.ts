import type { Request, Response } from "express";
import { DeliveryLocationService } from "../services/deliveryLocation.service.js";
import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";

export const getDeliveryCatalogue = async (req: Request, res: Response) => {
  try {
    const catalogue = await DeliveryLocationService.getDeliveryCatalogue();
    return res.status(200).json(catalogue);
  } catch (err: any) {
    logger.error(`[DeliveryLocation] getDeliveryCatalogue error: ${err?.message}`);
    return res.status(500).json({ success: false, message: "Failed to fetch delivery locations" });
  }
};

export const checkDeliveryServiceability = async (req: Request, res: Response) => {
  try {
    const {
      state,
      district,
      districtId,
      town,
      townId,
      serviceArea,
      serviceAreaId,
      postalCode,
      latitude,
      longitude,
    } = req.body;

    const lat = typeof latitude === "number" ? latitude : latitude ? parseFloat(latitude) : undefined;
    const lng = typeof longitude === "number" ? longitude : longitude ? parseFloat(longitude) : undefined;

    const result = await DeliveryLocationService.checkDeliveryEligibility({
      state,
      district,
      districtId,
      town,
      townId,
      serviceArea,
      serviceAreaId,
      postalCode,
      latitude: lat,
      longitude: lng,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    logger.error(`[DeliveryLocation] checkDeliveryServiceability error: ${err?.message}`);
    return res.status(500).json({ success: false, message: "Failed to evaluate delivery serviceability" });
  }
};

export const resolveGpsLocation = async (req: Request, res: Response) => {
  try {
    const latStr = (req.query.lat || req.query.latitude) as string;
    const lngStr = (req.query.lng || req.query.longitude) as string;

    if (!latStr || !lngStr) {
      return res.status(400).json({ success: false, message: "Query params 'lat' and 'lng' are required." });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: "Invalid numerical coordinates." });
    }

    const result = await DeliveryLocationService.checkDeliveryEligibility({
      latitude: lat,
      longitude: lng,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    logger.error(`[DeliveryLocation] resolveGpsLocation error: ${err?.message}`);
    return res.status(500).json({ success: false, message: "Failed to resolve GPS coordinates" });
  }
};

export const submitLocationRequest = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, state, district, city, postalCode, latitude, longitude } = req.body;

    if (!state || (!district && !city)) {
      return res.status(400).json({ success: false, message: "State and district/city are required." });
    }

    const request = await prisma.locationRequest.create({
      data: {
        requestType: "CUSTOMER",
        name: name?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        state: state.trim(),
        district: (district || city)?.trim() || null,
        city: city?.trim() || null,
        postalCode: postalCode?.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        adminNotes: "Submitted via Delivery Portal",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Thank you for your interest! Your location request has been recorded. We will notify you when AtlasBasket launches in your area.",
      request,
    });
  } catch (err: any) {
    logger.error(`[DeliveryLocation] submitLocationRequest error: ${err?.message}`);
    return res.status(500).json({ success: false, message: "Failed to record location request" });
  }
};
