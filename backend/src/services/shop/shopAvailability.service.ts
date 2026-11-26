import { prisma } from "../../config/prisma.js";
import { NotificationType } from "@prisma/client";
import { notificationService } from "../notification/notification.service.js";
import { broadcastShopAvailabilityUpdated } from "../chat/chat.service.js";

export interface SetAvailabilityParams {
    shopId: string;
    isOnline: boolean;
    reason?: string | null;
    actorType: "SELLER" | "ADMIN";
    actorId: string;
    actorName?: string;
    force?: boolean;
}

export interface ScheduleClosingParams {
    shopId: string;
    scheduledCloseAt: string | Date;
    closingReason?: string | null;
    timeZone?: string;
    actorId: string;
    actorName?: string;
}

export class ShopAvailabilityService {
    /**
     * Get active unfulfilled orders count for a shop
     */
    static async getActiveOrdersCount(shopId: string): Promise<number> {
        try {
            const count = await prisma.sellerOrder.count({
                where: {
                    seller: {
                        shop: { id: shopId }
                    },
                    status: {
                        in: [
                            "PENDING",
                            "ACCEPTED",
                            "PROCESSING",
                            "READY_FOR_PICKUP",
                            "PACKED"
                        ]
                    }
                }
            });
            return count;
        } catch (error) {
            console.error("[ShopAvailabilityService] getActiveOrdersCount error:", error);
            return 0;
        }
    }

    /**
     * Get availability details, countdown and history for a shop
     */
    static async getShopAvailability(shopId: string) {
        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            include: {
                availabilityLogs: {
                    orderBy: { createdAt: "desc" },
                    take: 10
                }
            }
        });

        if (!shop) {
            throw new Error("Shop not found");
        }

        const activeOrdersCount = await this.getActiveOrdersCount(shopId);

        const now = new Date();
        let isCountdownActive = false;
        let countdownSecondsRemaining: number | null = null;

        if (shop.isOnline && shop.scheduledCloseAt) {
            const diffMs = shop.scheduledCloseAt.getTime() - now.getTime();
            if (diffMs > 0 && diffMs <= 30 * 60 * 1000) {
                isCountdownActive = true;
                countdownSecondsRemaining = Math.max(0, Math.floor(diffMs / 1000));
            } else if (diffMs > 0) {
                countdownSecondsRemaining = Math.floor(diffMs / 1000);
            }
        }

        return {
            shopId: shop.id,
            isOnline: shop.isOnline,
            closingReason: shop.closingReason,
            closedAt: shop.closedAt,
            lastStatusChangedAt: shop.lastStatusChangedAt,
            lastStatusChangeSource: shop.lastStatusChangeSource,
            lastStatusChangedBy: shop.lastStatusChangedBy,
            scheduledCloseAt: shop.scheduledCloseAt,
            scheduledCloseReason: shop.scheduledCloseReason,
            scheduledCloseNoticeSent: shop.scheduledCloseNoticeSent,
            timeZone: shop.timeZone || "Asia/Kolkata",
            activeOrdersCount,
            isCountdownActive,
            countdownSecondsRemaining,
            recentLogs: shop.availabilityLogs
        };
    }

    /**
     * Manually switch shop Online or Offline
     */
    static async setManualAvailability(params: SetAvailabilityParams) {
        const { shopId, isOnline, reason, actorType, actorId, actorName, force } = params;

        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            include: { seller: true }
        });

        if (!shop) {
            throw new Error("Shop not found");
        }

        const activeOrdersCount = await this.getActiveOrdersCount(shopId);

        // If trying to go offline and active orders exist, require explicit confirmation (unless forced)
        if (!isOnline && activeOrdersCount > 0 && !force) {
            return {
                requiresConfirmation: true,
                activeOrdersCount,
                message: `You have ${activeOrdersCount} active order(s) pending fulfilment. Do you still wish to go offline? Accepted orders will not be cancelled.`
            };
        }

        const source = actorType === "ADMIN" ? "ADMIN_OVERRIDE" : "SELLER_MANUAL";
        const now = new Date();

        // Transaction to update shop state and append audit log
        const updatedShop = await prisma.$transaction(async (tx) => {
            const updateData: any = {
                isOnline,
                closedAt: isOnline ? null : (shop.closedAt || now),
                closingReason: isOnline ? null : (reason?.trim() || null),
                lastStatusChangedAt: now,
                lastStatusChangeSource: source,
                lastStatusChangedBy: actorId
            };

            // NOTE: Manual ONLINE must not silently cancel a scheduled closing!
            // When seller manually reopens a shop with a pending schedule, retain the schedule.
            // If going offline manually, we retain any schedule for the future as well.

            const result = await tx.shop.update({
                where: { id: shopId },
                data: updateData
            });

            await tx.shopAvailabilityLog.create({
                data: {
                    shopId,
                    status: isOnline,
                    source,
                    actorType,
                    actorId,
                    actorName: actorName || (actorType === "ADMIN" ? "Admin" : shop.name),
                    reason: reason?.trim() || (isOnline ? "Manual online switch" : "Manual offline switch")
                }
            });

            if (actorType === "ADMIN") {
                await tx.adminAction.create({
                    data: {
                        adminId: actorId,
                        actionType: "SHOP_AVAILABILITY_OVERRIDDEN" as any,
                        targetType: "SHOP",
                        targetId: shopId,
                        description: `Admin ${actorName || actorId} set shop availability to ${isOnline ? "ONLINE" : "OFFLINE"}: ${reason || "No reason specified"}`,
                        previousValue: { isOnline: shop.isOnline },
                        newValue: { isOnline, reason }
                    }
                });
            }

            return result;
        });

        // Broadcast real-time change across all connected clients & processes
        await broadcastShopAvailabilityUpdated({
            shopId: updatedShop.id,
            isOnline: updatedShop.isOnline,
            scheduledCloseAt: updatedShop.scheduledCloseAt ? updatedShop.scheduledCloseAt.toISOString() : null,
            closingReason: updatedShop.closingReason,
            closedAt: updatedShop.closedAt ? updatedShop.closedAt.toISOString() : null,
            lastStatusChangeSource: updatedShop.lastStatusChangeSource,
            lastStatusChangedBy: updatedShop.lastStatusChangedBy,
            lastStatusChangedAt: updatedShop.lastStatusChangedAt ? updatedShop.lastStatusChangedAt.toISOString() : null,
            timeZone: updatedShop.timeZone,
            activeOrdersCount
        });

        return {
            success: true,
            shop: updatedShop,
            activeOrdersCount
        };
    }

    /**
     * Schedule closing time
     */
    static async scheduleClosing(params: ScheduleClosingParams) {
        const { shopId, scheduledCloseAt, closingReason, timeZone, actorId, actorName } = params;

        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            throw new Error("Shop not found");
        }

        const closeDate = new Date(scheduledCloseAt);
        if (isNaN(closeDate.getTime())) {
            throw new Error("Invalid closing date/time provided");
        }

        const now = new Date();
        if (closeDate.getTime() <= now.getTime()) {
            throw new Error("Scheduled closing time must be in the future");
        }

        const effectiveTimeZone = timeZone || shop.timeZone || "Asia/Kolkata";

        // If the scheduled time is more than 30 mins away, reset notice sent flag.
        // If it's scheduled within 30 minutes, flag notice immediately.
        const diffMs = closeDate.getTime() - now.getTime();
        const withinThirtyMins = diffMs <= 30 * 60 * 1000;

        const updatedShop = await prisma.$transaction(async (tx) => {
            const result = await tx.shop.update({
                where: { id: shopId },
                data: {
                    scheduledCloseAt: closeDate,
                    scheduledCloseReason: closingReason?.trim() || null,
                    scheduledCloseNoticeSent: withinThirtyMins,
                    timeZone: effectiveTimeZone
                }
            });

            await tx.shopAvailabilityLog.create({
                data: {
                    shopId,
                    status: shop.isOnline,
                    source: "SCHEDULE_SET",
                    actorType: "SELLER",
                    actorId,
                    actorName: actorName || shop.name,
                    reason: closingReason?.trim() || "Scheduled closing time configured",
                    scheduledFor: closeDate
                }
            });

            return result;
        });

        if (withinThirtyMins) {
            // Send in-app notification immediately since close is within 30 mins
            await notificationService.createNotification({
                recipientType: "SELLER",
                recipientId: shop.sellerId,
                type: "SHOP_SCHEDULED_CLOSE_ALERT" as any,
                title: "Upcoming Shop Closing",
                body: `Your shop is scheduled to close at ${closeDate.toLocaleTimeString("en-IN", { timeZone: effectiveTimeZone })} (in less than 30 minutes).`,
                data: {
                    shopId: shop.id,
                    scheduledCloseAt: closeDate.toISOString()
                }
            });
        }

        const activeOrdersCount = await this.getActiveOrdersCount(shopId);

        await broadcastShopAvailabilityUpdated({
            shopId: updatedShop.id,
            isOnline: updatedShop.isOnline,
            scheduledCloseAt: updatedShop.scheduledCloseAt ? updatedShop.scheduledCloseAt.toISOString() : null,
            closingReason: updatedShop.closingReason,
            closedAt: updatedShop.closedAt ? updatedShop.closedAt.toISOString() : null,
            lastStatusChangeSource: updatedShop.lastStatusChangeSource,
            lastStatusChangedBy: updatedShop.lastStatusChangedBy,
            lastStatusChangedAt: updatedShop.lastStatusChangedAt ? updatedShop.lastStatusChangedAt.toISOString() : null,
            timeZone: updatedShop.timeZone,
            activeOrdersCount
        });

        return {
            success: true,
            shop: updatedShop,
            activeOrdersCount
        };
    }

    /**
     * Cancel scheduled closing
     */
    static async cancelScheduledClosing(shopId: string, actorId: string, actorName?: string) {
        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            throw new Error("Shop not found");
        }

        const previousScheduled = shop.scheduledCloseAt;

        const updatedShop = await prisma.$transaction(async (tx) => {
            const result = await tx.shop.update({
                where: { id: shopId },
                data: {
                    scheduledCloseAt: null,
                    scheduledCloseReason: null,
                    scheduledCloseNoticeSent: false
                }
            });

            await tx.shopAvailabilityLog.create({
                data: {
                    shopId,
                    status: shop.isOnline,
                    source: "SCHEDULE_CANCELLED",
                    actorType: "SELLER",
                    actorId,
                    actorName: actorName || shop.name,
                    reason: "Scheduled closing was cancelled by seller",
                    scheduledFor: previousScheduled
                }
            });

            return result;
        });

        const activeOrdersCount = await this.getActiveOrdersCount(shopId);

        await broadcastShopAvailabilityUpdated({
            shopId: updatedShop.id,
            isOnline: updatedShop.isOnline,
            scheduledCloseAt: null,
            closingReason: updatedShop.closingReason,
            closedAt: updatedShop.closedAt ? updatedShop.closedAt.toISOString() : null,
            lastStatusChangeSource: updatedShop.lastStatusChangeSource,
            lastStatusChangedBy: updatedShop.lastStatusChangedBy,
            lastStatusChangedAt: updatedShop.lastStatusChangedAt ? updatedShop.lastStatusChangedAt.toISOString() : null,
            timeZone: updatedShop.timeZone,
            activeOrdersCount
        });

        return {
            success: true,
            shop: updatedShop,
            activeOrdersCount
        };
    }

    /**
     * Periodic scheduler tick (executed every minute via cron)
     * Completely idempotent, resilient to server restarts and client disconnects
     */
    static async processScheduledAvailabilityTick() {
        const now = new Date();

        // 1. Process 30-minute advance countdown alerts
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
        const shopsNeedingAlert = await prisma.shop.findMany({
            where: {
                isOnline: true,
                scheduledCloseAt: {
                    gt: now,
                    lte: thirtyMinutesFromNow
                },
                scheduledCloseNoticeSent: false
            },
            include: { seller: true }
        });

        for (const shop of shopsNeedingAlert) {
            try {
                await prisma.shop.update({
                    where: { id: shop.id },
                    data: { scheduledCloseNoticeSent: true }
                });

                const formattedTime = shop.scheduledCloseAt?.toLocaleTimeString("en-IN", {
                    timeZone: shop.timeZone || "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit"
                });

                await notificationService.createNotification({
                    recipientType: "SELLER",
                    recipientId: shop.sellerId,
                    type: "SHOP_SCHEDULED_CLOSE_ALERT" as any,
                    title: "Upcoming Shop Closing (30 mins)",
                    body: `Your shop '${shop.name}' is scheduled to close at ${formattedTime}. Please review any remaining open tasks.`,
                    data: {
                        shopId: shop.id,
                        scheduledCloseAt: shop.scheduledCloseAt?.toISOString()
                    }
                });

                // Broadcast countdown update
                await broadcastShopAvailabilityUpdated({
                    shopId: shop.id,
                    isOnline: true,
                    scheduledCloseAt: shop.scheduledCloseAt?.toISOString(),
                    timeZone: shop.timeZone
                });
            } catch (err) {
                console.error(`[ShopAvailability] Error processing 30-min alert for shop ${shop.id}:`, err);
            }
        }

        // 2. Process automatic scheduled closings
        const shopsDueToClose = await prisma.shop.findMany({
            where: {
                isOnline: true,
                scheduledCloseAt: {
                    lte: now
                }
            },
            include: { seller: true }
        });

        for (const shop of shopsDueToClose) {
            try {
                const closingReason = shop.scheduledCloseReason || "Automatic scheduled closing";

                await prisma.$transaction(async (tx) => {
                    await tx.shop.update({
                        where: { id: shop.id },
                        data: {
                            isOnline: false,
                            closedAt: now,
                            closingReason,
                            lastStatusChangedAt: now,
                            lastStatusChangeSource: "SCHEDULED_AUTOMATIC",
                            lastStatusChangedBy: "SYSTEM",
                            scheduledCloseAt: null,
                            scheduledCloseReason: null,
                            scheduledCloseNoticeSent: false
                        }
                    });

                    await tx.shopAvailabilityLog.create({
                        data: {
                            shopId: shop.id,
                            status: false,
                            source: "SCHEDULED_AUTOMATIC",
                            actorType: "SYSTEM",
                            actorId: null,
                            actorName: "System Scheduler",
                            reason: closingReason,
                            scheduledFor: shop.scheduledCloseAt
                        }
                    });
                });

                // Send in-app notification to seller
                await notificationService.createNotification({
                    recipientType: "SELLER",
                    recipientId: shop.sellerId,
                    type: "SHOP_SCHEDULED_CLOSED" as any,
                    title: "Shop Closed Automatically",
                    body: `Your shop '${shop.name}' is now OFFLINE according to your scheduled closing time. You can manually reopen it at any time.`,
                    data: {
                        shopId: shop.id,
                        closedAt: now.toISOString(),
                        reason: closingReason
                    }
                });

                // Real-time broadcast to all seller & customer clients
                await broadcastShopAvailabilityUpdated({
                    shopId: shop.id,
                    isOnline: false,
                    scheduledCloseAt: null,
                    closingReason,
                    closedAt: now.toISOString(),
                    lastStatusChangeSource: "SCHEDULED_AUTOMATIC",
                    lastStatusChangedBy: "SYSTEM",
                    lastStatusChangedAt: now.toISOString(),
                    timeZone: shop.timeZone
                });

                console.log(`[ShopAvailability] Shop ${shop.id} (${shop.name}) automatically closed at scheduled time.`);
            } catch (err) {
                console.error(`[ShopAvailability] Error processing scheduled close for shop ${shop.id}:`, err);
            }
        }
    }
}
