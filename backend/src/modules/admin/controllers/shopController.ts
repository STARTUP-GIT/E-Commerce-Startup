import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";
import { invalidatePublicCache } from "../../../middleware/cache.js";

export const getShops = async (req: Request, res: Response) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;

        const whereClause: any = {};

        if (status) {
            whereClause.status = String(status);
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: String(search), mode: "insensitive" } },
                { slug: { contains: String(search), mode: "insensitive" } },
                { businessName: { contains: String(search), mode: "insensitive" } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [shops, total] = await prisma.$transaction([
            prisma.shop.findMany({
                where: whereClause,
                include: { seller: true },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.shop.count({ where: whereClause })
        ]);

        return res.status(200).json({
            shops,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        console.error("GET SHOPS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);

        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            include: {
                seller: {
                    include: {
                        verifications: {
                            orderBy: { createdAt: "desc" }
                        },
                        products: {
                            where: { isDeleted: false },
                            orderBy: { createdAt: "desc" },
                            take: 100
                        }
                    }
                },
                defaultPickupAddress: true,
                approvalRequests: {
                    include: {
                        reviewedByAdmin: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        },
                        agreements: {
                            include: {
                                issuedByAdmin: {
                                    select: { id: true, firstName: true, lastName: true, email: true }
                                }
                            },
                            orderBy: { version: "desc" }
                        }
                    },
                    orderBy: { createdAt: "desc" }
                },
                agreements: {
                    include: {
                        issuedByAdmin: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    },
                    orderBy: { version: "desc" }
                },
                reviewedByAdmin: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                packingFeeRequests: {
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const auditEvents = await prisma.adminAction.findMany({
            where: {
                OR: [
                    { targetType: "Shop", targetId: shopId },
                    { targetType: "Seller", targetId: shop.sellerId }
                ]
            },
            include: {
                admin: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            },
            orderBy: { performedAt: "desc" },
            take: 20
        });

        return res.status(200).json({ shop, auditEvents });
    } catch (error: any) {
        console.error("GET SHOP DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body ?? {};

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ success: false, message: "Reason is required." });
        }
        if (reason.trim().length < 5 || reason.trim().length > 500) {
            return res.status(400).json({ success: false, message: "Reason must be between 5 and 500 characters." });
        }

        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        await prisma.shop.delete({
            where: { id: shopId }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_BANNED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop '${shop.name}' permanently deleted by admin. Reason: ${reason}`,
            previousValue: { name: shop.name },
            newValue: null
        });

        invalidatePublicCache();

        return res.status(200).json({ message: "Shop deleted successfully" });
    } catch (error: any) {
        console.error("DELETE SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const approvePackingPermission = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { approvedMaxFee, amount } = req.body ?? {};

        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const pendingRequest = await prisma.packingFeeRequest.findFirst({
            where: {
                shopId,
                status: "PENDING"
            }
        });

        const requestedAmount = pendingRequest?.requestedMaxFee !== null && pendingRequest?.requestedMaxFee !== undefined
            ? Number(pendingRequest.requestedMaxFee)
            : null;

        let finalApprovedMaxFee: number | null = requestedAmount;

        const incomingFee = approvedMaxFee !== undefined && approvedMaxFee !== null && String(approvedMaxFee).trim() !== ''
            ? approvedMaxFee
            : amount;

        if (incomingFee !== undefined && incomingFee !== null && String(incomingFee).trim() !== '') {
            const parsedFee = Number(incomingFee);
            if (isNaN(parsedFee) || parsedFee <= 0) {
                return res.status(400).json({ message: "Approved packaging fee must be a valid positive amount." });
            }
            if (requestedAmount !== null && parsedFee > requestedAmount) {
                return res.status(400).json({
                    message: `Approved maximum fee (₹${parsedFee.toFixed(2)}) cannot exceed the seller's requested maximum of ₹${requestedAmount.toFixed(2)}.`
                });
            }
            finalApprovedMaxFee = parsedFee;
        }

        if (pendingRequest) {
            await prisma.packingFeeRequest.update({
                where: { id: pendingRequest.id },
                data: {
                    status: "APPROVED",
                    approvedMaxFee: finalApprovedMaxFee,
                    reviewedByAdminId: adminId,
                    reviewedAt: new Date()
                }
            });
        }

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                packingFeeApproved: true,
                packingFeeApprovalStatus: "APPROVED",
                packingFeeApprovedAt: new Date(),
                packingFeeApprovedMaxAmount: finalApprovedMaxFee,
                packingFeeRejectedReason: null
            }
        });

        // Notify seller with approved max fee detail
        const feeDetailMsg = finalApprovedMaxFee !== null
            ? ` with an approved maximum fee of ₹${Number(finalApprovedMaxFee).toFixed(2)}.`
            : '.';

        await prisma.notification.create({
            data: {
                sellerId: shop.sellerId,
                type: "PACKING_FEE_APPROVED",
                channel: "IN_APP",
                status: "PENDING",
                title: "Packing Fee Authorization Approved",
                body: `Your request to charge packing fees for shop '${shop.name}' has been approved${feeDetailMsg} You can now configure this under shop settings up to the approved limit.`,
                sentAt: new Date()
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Shop",
            targetId: shopId,
            description: `Packing fee permission approved for shop: ${shop.name}`,
            previousValue: { packingFeeApproved: shop.packingFeeApproved },
            newValue: { packingFeeApproved: true }
        });

        return res.status(200).json({
            message: "Packing fee permission approved successfully",
            shop: updatedShop
        });
    } catch (error: any) {
        console.error("APPROVE PACKING PERMISSION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const rejectPackingPermission = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body ?? {};

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ success: false, message: "Reason is required." });
        }
        if (reason.trim().length < 5 || reason.trim().length > 500) {
            return res.status(400).json({ success: false, message: "Reason must be between 5 and 500 characters." });
        }

        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const pendingRequest = await prisma.packingFeeRequest.findFirst({
            where: {
                shopId,
                status: "PENDING"
            }
        });

        if (pendingRequest) {
            await prisma.packingFeeRequest.update({
                where: { id: pendingRequest.id },
                data: {
                    status: "REJECTED",
                    rejectionReason: reason.trim(),
                    reviewedByAdminId: adminId,
                    reviewedAt: new Date()
                }
            });
        }

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                packingFeeApproved: false,
                packingFeeEnabled: false,
                enablePackingFee: false,
                packingFeeApprovalStatus: "REJECTED",
                packingFeeRejectedReason: reason.trim()
            }
        });

        // Notify seller
        await prisma.notification.create({
            data: {
                sellerId: shop.sellerId,
                type: "PACKING_FEE_REJECTED",
                channel: "IN_APP",
                status: "PENDING",
                title: "Packing Fee Authorization Rejected",
                body: `Your request to charge packing fees for shop '${shop.name}' has been rejected. Reason: ${reason.trim()}`,
                sentAt: new Date()
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Shop",
            targetId: shopId,
            description: `Packing fee permission rejected/disabled for shop: ${shop.name}. Reason: ${reason}`,
            previousValue: { packingFeeApproved: shop.packingFeeApproved, enablePackingFee: shop.enablePackingFee },
            newValue: { packingFeeApproved: false, enablePackingFee: false }
        });

        return res.status(200).json({
            message: "Packing fee permission rejected/disabled",
            shop: updatedShop
        });
    } catch (error: any) {
        console.error("REJECT PACKING PERMISSION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const revokePackingPermission = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;

        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                packingFeeApproved: false,
                packingFeeEnabled: false,
                enablePackingFee: false,
                packingFeeApprovalStatus: "NOT_APPROVED",
                packingFeeRejectedReason: "Authorization revoked by administration."
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Shop",
            targetId: shopId,
            description: `Packing fee permission revoked for shop: ${shop.name}`,
            previousValue: { packingFeeApproved: shop.packingFeeApproved },
            newValue: { packingFeeApproved: false }
        });

        return res.status(200).json({
            message: "Packing fee permission revoked successfully",
            shop: updatedShop
        });
    } catch (error: any) {
        console.error("REVOKE PACKING PERMISSION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const issueShopAgreement = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const {
            title,
            templateId,
            templateVersion,
            commissionPercentage,
            commissionNotes,
            customerDeliveryShare,
            sellerDeliveryShare,
            deliveryObligations,
            sellerObligations,
            content,
            effectiveDate,
            customTerms
        } = req.body ?? {};

        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            include: {
                seller: true,
                approvalRequests: {
                    orderBy: { createdAt: "desc" },
                    take: 1
                },
                agreements: {
                    orderBy: { version: "desc" },
                    take: 1
                }
            }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const commRate = commissionPercentage !== undefined ? Number(commissionPercentage) : Number(shop.commissionPercentage ?? 10.0);
        if (isNaN(commRate) || commRate < 0 || commRate > 100) {
            return res.status(400).json({ message: "Commission percentage must be between 0 and 100." });
        }

        const custShare = customerDeliveryShare !== undefined ? Number(customerDeliveryShare) : (shop.customerDeliveryShare ?? 75);
        const sellShare = sellerDeliveryShare !== undefined ? Number(sellerDeliveryShare) : (shop.sellerDeliveryShare ?? 25);

        // Find or create active approval request
        let activeRequest = shop.approvalRequests[0];
        if (!activeRequest || activeRequest.status === "APPROVED" || activeRequest.status === "REJECTED") {
            activeRequest = await prisma.shopApprovalRequest.create({
                data: {
                    shopId,
                    sellerId: shop.sellerId,
                    status: "PENDING_REVIEW",
                    notes: "Approval request initialized for agreement issuance",
                    submittedAt: new Date()
                }
            });
        }

        // Determine version number
        const latestVersion = shop.agreements[0]?.version ?? 0;
        const newVersion = latestVersion + 1;

        const defaultContent = `
# SHOP SELLER AGREEMENT (v${newVersion})
**Store Name:** ${shop.name}
**Seller:** ${shop.seller.firstName} ${shop.seller.lastName} (${shop.seller.email})
**Effective Date:** ${new Date().toISOString().split("T")[0]}

## 1. Commercial Terms & Commission
- Platform Commission: **${commRate}%** on settled item values.
- Commission Notes: ${commissionNotes || "Standard marketplace tier"}.
- Payout Schedule: Monthly automated settlement to linked verified bank accounts.

## 2. Delivery & Fulfilment Obligations
- Customer Delivery Share: **${custShare}%**
- Seller Delivery Share: **${sellShare}%**
- Delivery Obligation: ${deliveryObligations || "Seller must dispatch ready-to-ship orders within 24 hours of platform assignment."}

## 3. General Seller Obligations & Standards
- ${sellerObligations || "The seller certifies that all catalog items adhere to quality benchmarks and consumer protection regulations."}
- Fraud, counterfeits, or misleading listings result in immediate penalties and account suspension.
`;

        const finalContent = (content && typeof content === "string" && content.trim().length > 20)
            ? content.trim()
            : defaultContent.trim();

        const documentHash = crypto.createHash("sha256").update(finalContent).digest("hex");

        const result = await prisma.$transaction(async (tx) => {
            // If previous agreement was ISSUED, supersede it
            if (shop.agreements[0]?.status === "ISSUED") {
                await tx.shopAgreement.update({
                    where: { id: shop.agreements[0].id },
                    data: { status: "SUPERSEDED" }
                });
            }

            const agreement = await tx.shopAgreement.create({
                data: {
                    shopId,
                    sellerId: shop.sellerId,
                    approvalRequestId: activeRequest.id,
                    version: newVersion,
                    title: title || `Seller Operating Agreement — ${shop.name}`,
                    templateId: templateId || null,
                    templateVersion: templateVersion || null,
                    content: finalContent,
                    documentHash,
                    commissionPercentage: commRate,
                    commissionNotes: commissionNotes || null,
                    customerDeliveryShare: custShare,
                    sellerDeliveryShare: sellShare,
                    deliveryObligations: deliveryObligations || null,
                    sellerObligations: sellerObligations || null,
                    customTerms: customTerms || undefined,
                    status: "ISSUED",
                    issuedByAdminId: adminId,
                    issuedAt: new Date(),
                    effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date()
                }
            });

            await tx.shopApprovalRequest.update({
                where: { id: activeRequest.id },
                data: {
                    status: "AGREEMENT_ISSUED",
                    reviewedByAdmin: { connect: { id: adminId } },
                    reviewedAt: new Date()
                }
            });

            // Update shop commercial terms preview
            await tx.shop.update({
                where: { id: shopId },
                data: {
                    commissionPercentage: commRate,
                    commissionNotes: commissionNotes || null,
                    customerDeliveryShare: custShare,
                    sellerDeliveryShare: sellShare
                }
            });

            // Notify seller
            await tx.notification.create({
                data: {
                    sellerId: shop.sellerId,
                    type: "SHOP_AGREEMENT_ISSUED",
                    channel: "IN_APP",
                    status: "PENDING",
                    title: "Seller Agreement Issued",
                    body: `A shop agreement (v${newVersion}) has been issued for '${shop.name}'. Please review and accept the agreement terms in your seller portal.`,
                    data: {
                        link: "/shop",
                        shopId,
                        agreementId: agreement.id
                    },
                    sentAt: new Date()
                }
            });

            return agreement;
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SHOP_AGREEMENT_ISSUED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop agreement v${newVersion} issued for '${shop.name}' with commission ${commRate}%.`,
            previousValue: { agreementVersion: latestVersion },
            newValue: { agreementVersion: newVersion, agreementId: result.id }
        });

        invalidatePublicCache();

        return res.status(201).json({
            message: "Shop agreement issued successfully.",
            agreement: result
        });
    } catch (error: any) {
        console.error("ISSUE SHOP AGREEMENT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const approveShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;

        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            include: {
                seller: true,
                agreements: {
                    orderBy: { version: "desc" },
                    take: 1
                },
                approvalRequests: {
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });

        if (!shop) return res.status(404).json({ message: "Shop not found" });

        // Atomic guard against simultaneous approvals
        if (shop.status === "APPROVED") {
            return res.status(200).json({ message: "Shop is already approved", shop });
        }

        const latestAgreement = shop.agreements[0];
        if (!latestAgreement || latestAgreement.status !== "ACCEPTED") {
            return res.status(400).json({
                message: "Cannot approve shop: An individual shop agreement must be issued and accepted by the seller before final approval."
            });
        }

        const activeRequest = shop.approvalRequests[0];

        const updatedShop = await prisma.$transaction(async (tx) => {
            // Check race condition again inside transaction
            const check = await tx.shop.findUnique({ where: { id: shopId } });
            if (check?.status === "APPROVED") return check;

            const approved = await tx.shop.update({
                where: { id: shopId },
                data: {
                    status: "APPROVED",
                    reviewedByAdminId: adminId,
                    reviewedAt: new Date(),
                    rejectionReason: null,
                    commissionPercentage: latestAgreement.commissionPercentage,
                    commissionNotes: latestAgreement.commissionNotes,
                    customerDeliveryShare: latestAgreement.customerDeliveryShare,
                    sellerDeliveryShare: latestAgreement.sellerDeliveryShare
                }
            });

            if (activeRequest) {
                await tx.shopApprovalRequest.update({
                    where: { id: activeRequest.id },
                    data: {
                        status: "APPROVED",
                        approvedAt: new Date(),
                        reviewedByAdmin: { connect: { id: adminId } },
                        reviewedAt: new Date()
                    }
                });
            }

            // Notify seller
            await tx.notification.create({
                data: {
                    sellerId: shop.sellerId,
                    type: "SHOP_APPROVED",
                    channel: "IN_APP",
                    status: "PENDING",
                    title: "Shop Approved!",
                    body: `Congratulations! Your storefront '${shop.name}' has been approved and is now active on the marketplace.`,
                    data: { link: "/dashboard", shopId },
                    sentAt: new Date()
                }
            });

            return approved;
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SHOP_APPROVED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop '${shop.name}' given final approval with agreed commission rate ${latestAgreement.commissionPercentage}%.`,
            previousValue: { status: shop.status },
            newValue: { status: "APPROVED", commissionPercentage: latestAgreement.commissionPercentage }
        });

        invalidatePublicCache();

        return res.status(200).json({ message: "Shop approved successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("APPROVE SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const rejectShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body ?? {};

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ success: false, message: "Reason is required." });
        }
        if (reason.trim().length < 5 || reason.trim().length > 500) {
            return res.status(400).json({ success: false, message: "Reason must be between 5 and 500 characters." });
        }

        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            include: {
                seller: true,
                approvalRequests: {
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const activeRequest = shop.approvalRequests[0];

        const updatedShop = await prisma.$transaction(async (tx) => {
            const rejected = await tx.shop.update({
                where: { id: shopId },
                data: {
                    status: "REJECTED",
                    reviewedByAdminId: adminId,
                    reviewedAt: new Date(),
                    rejectionReason: reason.trim()
                }
            });

            if (activeRequest) {
                await tx.shopApprovalRequest.update({
                    where: { id: activeRequest.id },
                    data: {
                        status: "REJECTED",
                        rejectedAt: new Date(),
                        reviewedByAdmin: { connect: { id: adminId } },
                        reviewedAt: new Date(),
                        rejectionReason: reason.trim()
                    }
                });
            }

            // Notify seller
            await tx.notification.create({
                data: {
                    sellerId: shop.sellerId,
                    type: "SHOP_REJECTED",
                    channel: "IN_APP",
                    status: "PENDING",
                    title: "Shop Registration Rejected",
                    body: `Your shop application for '${shop.name}' was rejected. Reason: ${reason.trim()}`,
                    data: { link: "/shop", shopId },
                    sentAt: new Date()
                }
            });

            return rejected;
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SHOP_REJECTED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop '${shop.name}' rejected by admin. Reason: ${reason.trim()}`,
            previousValue: { status: shop.status },
            newValue: { status: "REJECTED", rejectionReason: reason.trim() }
        });

        invalidatePublicCache();

        return res.status(200).json({ message: "Shop rejected", shop: updatedShop });
    } catch (error: any) {
        console.error("REJECT SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const suspendShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body ?? {};

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ success: false, message: "Reason is required." });
        }
        if (reason.trim().length < 5 || reason.trim().length > 500) {
            return res.status(400).json({ success: false, message: "Reason must be between 5 and 500 characters." });
        }

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                status: "SUSPENDED",
                reviewedByAdminId: adminId,
                reviewedAt: new Date(),
                rejectionReason: reason || "Suspended for policy review"
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SHOP_SUSPENDED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop ${shop.name} suspended by admin. Reason: ${reason || 'None provided'}`,
            previousValue: { status: shop.status },
            newValue: { status: "SUSPENDED" }
        });

        invalidatePublicCache();

        return res.status(200).json({ message: "Shop suspended successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("SUSPEND SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const disableShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body ?? {};

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ success: false, message: "Reason is required." });
        }
        if (reason.trim().length < 5 || reason.trim().length > 500) {
            return res.status(400).json({ success: false, message: "Reason must be between 5 and 500 characters." });
        }

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                status: "DISABLED",
                reviewedByAdminId: adminId,
                reviewedAt: new Date(),
                rejectionReason: reason || "Permanently disabled by admin"
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SHOP_DISABLED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop ${shop.name} disabled by admin. Reason: ${reason || 'None provided'}`,
            previousValue: { status: shop.status },
            newValue: { status: "DISABLED" }
        });

        invalidatePublicCache();

        return res.status(200).json({ message: "Shop disabled successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("DISABLE SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateShopConfig = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { commissionPercentage, commissionNotes, customerDeliveryShare, sellerDeliveryShare, enablePackingFee, packingFeeApproved } = req.body;

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                commissionPercentage: commissionPercentage !== undefined ? Number(commissionPercentage) : undefined,
                commissionNotes: commissionNotes !== undefined ? commissionNotes : undefined,
                customerDeliveryShare: customerDeliveryShare !== undefined ? Number(customerDeliveryShare) : undefined,
                sellerDeliveryShare: sellerDeliveryShare !== undefined ? Number(sellerDeliveryShare) : undefined,
                enablePackingFee: enablePackingFee !== undefined ? Boolean(enablePackingFee) : undefined,
                packingFeeApproved: packingFeeApproved !== undefined ? Boolean(packingFeeApproved) : undefined,
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Shop",
            targetId: shopId,
            description: `Configured shop settings for ${shop.name}`,
            previousValue: {
                commissionPercentage: shop.commissionPercentage,
                commissionNotes: shop.commissionNotes,
                customerDeliveryShare: shop.customerDeliveryShare,
                sellerDeliveryShare: shop.sellerDeliveryShare,
                enablePackingFee: shop.enablePackingFee,
                packingFeeApproved: shop.packingFeeApproved
            },
            newValue: {
                commissionPercentage: updatedShop.commissionPercentage,
                commissionNotes: updatedShop.commissionNotes,
                customerDeliveryShare: updatedShop.customerDeliveryShare,
                sellerDeliveryShare: updatedShop.sellerDeliveryShare,
                enablePackingFee: updatedShop.enablePackingFee,
                packingFeeApproved: updatedShop.packingFeeApproved
            }
        });

        invalidatePublicCache();

        return res.status(200).json({ message: "Shop configurations updated successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("UPDATE SHOP CONFIG ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getPackingFeeRequests = async (req: Request, res: Response) => {
    try {
        const requests = await prisma.packingFeeRequest.findMany({
            include: {
                shop: {
                    include: {
                        seller: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({ requests });
    } catch (error: any) {
        console.error("GET PACKING FEE REQUESTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getAllAgreements = async (req: Request, res: Response) => {
    try {
        const { shopId, sellerId, status, search, page = 1, limit = 20 } = req.query;

        const where: any = {};
        if (shopId) where.shopId = String(shopId);
        if (sellerId) where.sellerId = String(sellerId);
        if (status) where.status = String(status);
        if (search) {
            where.OR = [
                { title: { contains: String(search), mode: "insensitive" } },
                { shop: { name: { contains: String(search), mode: "insensitive" } } },
                { seller: { firstName: { contains: String(search), mode: "insensitive" } } },
                { seller: { lastName: { contains: String(search), mode: "insensitive" } } },
                { seller: { email: { contains: String(search), mode: "insensitive" } } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [agreements, total] = await prisma.$transaction([
            prisma.shopAgreement.findMany({
                where,
                include: {
                    shop: {
                        select: { id: true, name: true, slug: true, status: true }
                    },
                    seller: {
                        select: { id: true, firstName: true, lastName: true, email: true }
                    },
                    issuedByAdmin: {
                        select: { id: true, firstName: true, lastName: true, email: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.shopAgreement.count({ where })
        ]);

        return res.status(200).json({
            agreements,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        console.error("GET ALL AGREEMENTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
