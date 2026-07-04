import express from "express";
import { prisma } from "../../../config/prisma.js";
import PorterService from "../services/porter.service.js";

const router = express.Router();

// Use raw body for webhook to allow HMAC verification
router.post("/webhook/delivery", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const raw = req.body;
    const bodyString = raw instanceof Buffer ? raw.toString("utf8") : typeof raw === "string" ? raw : JSON.stringify(raw);
    let payload: any;
    try {
      payload = JSON.parse(bodyString);
    } catch (e) {
      payload = req.body;
    }

    const provider = (payload.provider || payload.source || "UNKNOWN").toUpperCase();
    const providerOrderId = payload.orderId || payload.providerOrderId || payload.id || (payload.data && payload.data.orderId);
    const providerStatus = payload.status || payload.event || (payload.data && payload.data.status);
    const signatureHeader = req.headers["x-hub-signature"] || req.headers["x-signature"] || req.headers["x-porter-signature"];

    if (!providerOrderId || !providerStatus) return res.status(400).json({ message: "Invalid payload" });

    // Verify signature for known providers if secret configured
    if (provider === "PORTER") {
      const signature = typeof signatureHeader === "string" ? signatureHeader : undefined;
      const secret = process.env.PORTER_WEBHOOK_SECRET;
      
      if (secret || process.env.NODE_ENV?.toLowerCase() === "production") {
        const valid = PorterService.verifyWebhookSignature(bodyString, signature);
        if (!valid) {
          console.warn("Invalid porter webhook signature");
          return res.status(401).json({ message: "Invalid signature" });
        }
      }
    }

    // Deduplication & Idempotency: Ignore duplicate events and replay attacks
    const crypto = await import("crypto");
    const payloadHash = crypto.createHash("sha256").update(bodyString).digest("hex");
    const eventId = payload.eventId || payload.event_id || `${providerOrderId}_${providerStatus}`;

    const existingEvent = await prisma.webhookEvent.findFirst({
      where: {
        OR: [
          { payloadHash },
          {
            provider,
            providerEventId: eventId
          }
        ]
      }
    });

    if (existingEvent) {
      return res.status(200).json({ message: "Webhook already processed" });
    }

    // Store processed webhook ID
    await prisma.webhookEvent.create({
      data: {
        provider,
        providerEventId: eventId,
        payloadHash,
        processedAt: new Date()
      }
    });

    // find delivery by providerOrderId stored in notes JSON
    let delivery = await prisma.delivery.findFirst({ where: { notes: { contains: providerOrderId } } });
    if (!delivery) {
      // fallback: try to find by sellerOrderId if present
      delivery = await prisma.delivery.findFirst({ where: { sellerOrderId: providerOrderId } });
    }
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    // idempotency: ignore if status same as current
    const internalStatus = String(providerStatus).toUpperCase() as any;
    if (delivery.status === internalStatus) return res.status(200).json({ message: "Already processed" });

    await prisma.delivery.update({ where: { id: delivery.id }, data: { status: internalStatus } });

    await prisma.orderTimelineEvent.create({ data: { entityType: "DELIVERY", deliveryId: delivery.id, status: internalStatus, title: `Webhook: ${internalStatus}`, description: `Status updated from ${provider} webhook`, metadata: JSON.parse(JSON.stringify(payload)) } });

    return res.status(200).json({ message: "Processed" });
  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
