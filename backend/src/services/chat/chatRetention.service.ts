import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { deleteObject } from "../../config/storage.js";
import cloudinaryService from "../storage/cloudnary.service.js";

/**
 * Authoritative 10-day retention policy for all AtlasBasket support chat messages.
 * Messages older than 10 days (relative to UTC message creation timestamp)
 * must automatically expire, be omitted from queries, and be permanently deleted along with attachments.
 */
export const CHAT_MESSAGE_RETENTION_DAYS = 10;
export const CHAT_MESSAGE_RETENTION_MS = CHAT_MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Calculates the UTC retention cutoff Date.
 * Any message with createdAt < cutoff is expired.
 */
export function getRetentionCutoffDate(baseDate: Date = new Date()): Date {
    return new Date(baseDate.getTime() - CHAT_MESSAGE_RETENTION_MS);
}

/**
 * Returns a Prisma where clause filter that excludes expired messages.
 */
export function getMessageRetentionFilter(baseDate: Date = new Date()) {
    return {
        createdAt: {
            gte: getRetentionCutoffDate(baseDate)
        }
    };
}

/**
 * Deletes stored attachments (S3 or Cloudinary) associated with an expired message.
 */
async function cleanupAttachments(attachments: string[]): Promise<number> {
    if (!attachments || attachments.length === 0) return 0;
    let deletedCount = 0;

    for (const att of attachments) {
        if (!att || typeof att !== "string") continue;
        try {
            // Check if it's a Cloudinary URL or publicId
            if (att.includes("cloudinary.com") || att.includes("/image/upload/")) {
                const parts = att.split("/");
                const fileNameWithExt = parts[parts.length - 1];
                const folderName = parts[parts.length - 2];
                if (fileNameWithExt) {
                    const publicId = folderName && folderName !== "upload"
                        ? `${folderName}/${fileNameWithExt.split(".")[0]}`
                        : fileNameWithExt.split(".")[0];
                    await cloudinaryService.deleteImage(publicId).catch(() => {});
                    deletedCount++;
                    continue;
                }
            }

            // Otherwise attempt S3 deletion via storage config
            const deleted = await deleteObject(att);
            if (deleted) deletedCount++;
        } catch (err: any) {
            logger.warn("[ChatRetention] Could not delete attachment object:", {
                attachment: att,
                error: err?.message
            });
        }
    }

    return deletedCount;
}

export interface CleanupResult {
    deletedMessagesCount: number;
    deletedAttachmentsCount: number;
    cutoffDate: Date;
}

/**
 * Scans the database and permanently deletes all ConversationMessages
 * created before the 10-day retention cutoff, including their attachments.
 * Retains conversation parent records for auditing and operational reporting.
 */
export async function cleanupExpiredChatMessages(options?: {
    baseDate?: Date;
    batchSize?: number;
}): Promise<CleanupResult> {
    const baseDate = options?.baseDate || new Date();
    const cutoffDate = getRetentionCutoffDate(baseDate);
    const batchSize = options?.batchSize || 1000;

    let totalDeletedMessages = 0;
    let totalDeletedAttachments = 0;

    try {
        // Fetch expired messages in batches
        const expiredMessages = await prisma.conversationMessage.findMany({
            where: {
                createdAt: {
                    lt: cutoffDate
                }
            },
            take: batchSize,
            select: {
                id: true,
                attachments: true,
                conversationId: true
            }
        });

        if (expiredMessages.length === 0) {
            return {
                deletedMessagesCount: 0,
                deletedAttachmentsCount: 0,
                cutoffDate
            };
        }

        // 1. Delete attachments from object storage
        const allAttachments: string[] = [];
        for (const msg of expiredMessages) {
            if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
                allAttachments.push(...msg.attachments);
            }
        }

        if (allAttachments.length > 0) {
            totalDeletedAttachments = await cleanupAttachments(allAttachments);
        }

        // 2. Permanently delete expired messages from DB
        const expiredIds = expiredMessages.map((m) => m.id);
        const deleteResult = await prisma.conversationMessage.deleteMany({
            where: {
                id: { in: expiredIds }
            }
        });

        totalDeletedMessages = deleteResult.count;

        logger.info("[ChatRetention] Completed 10-day chat expiration cleanup", {
            cutoffDate: cutoffDate.toISOString(),
            deletedMessages: totalDeletedMessages,
            deletedAttachments: totalDeletedAttachments
        });

        return {
            deletedMessagesCount: totalDeletedMessages,
            deletedAttachmentsCount: totalDeletedAttachments,
            cutoffDate
        };
    } catch (err: any) {
        logger.error("[ChatRetention] Error during expired chat cleanup:", {
            error: err?.message || err
        });
        return {
            deletedMessagesCount: totalDeletedMessages,
            deletedAttachmentsCount: totalDeletedAttachments,
            cutoffDate
        };
    }
}

let retentionIntervalTimer: NodeJS.Timeout | null = null;

/**
 * Starts the periodic background retention scheduler.
 * Runs once immediately upon startup, then every hour.
 */
export function startChatRetentionScheduler(intervalMs: number = 60 * 60 * 1000): void {
    if (retentionIntervalTimer) return;

    // Run initial catch-up asynchronously after small startup delay
    setTimeout(() => {
        cleanupExpiredChatMessages().catch((err) => {
            logger.warn("[ChatRetention] Initial startup cleanup warning:", { error: err?.message });
        });
    }, 5000);

    retentionIntervalTimer = setInterval(() => {
        cleanupExpiredChatMessages().catch((err) => {
            logger.error("[ChatRetention] Periodic cleanup failed:", { error: err?.message });
        });
    }, intervalMs);

    if (typeof retentionIntervalTimer.unref === "function") {
        retentionIntervalTimer.unref();
    }

    logger.info("[ChatRetention] Background 10-day retention scheduler active (interval: 1h)");
}

export function stopChatRetentionScheduler(): void {
    if (retentionIntervalTimer) {
        clearInterval(retentionIntervalTimer);
        retentionIntervalTimer = null;
    }
}
