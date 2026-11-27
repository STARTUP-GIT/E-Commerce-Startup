import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getSellerProfile = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: {
                shop: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        status: true,
                        rejectionReason: true,
                        businessName: true,
                        gstNumber: true,
                        gstRegistered: true,
                        createdAt: true,
                    }
                },
                verifications: {
                    where: { isCurrent: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                        status: true,
                        gstRegistered: true,
                        gstNumber: true,
                        createdAt: true,
                    }
                }
            }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        const shopData = (seller as any).shop || null;
        const verificationsData = (seller as any).verifications || [];

        const totalFields = 8;
        const filledFields = [
            seller.firstName,
            seller.lastName,
            seller.email,
            seller.phone,
            seller.avatarUrl,
            shopData?.name,
            shopData?.gstNumber,
        ].filter(Boolean).length;

        const profileCompletion = Math.round((filledFields / totalFields) * 100);

        return res.status(200).json({
            seller: {
                id: seller.id,
                username: seller.username,
                email: seller.email,
                firstName: seller.firstName,
                lastName: seller.lastName,
                phone: seller.phone,
                avatarUrl: seller.avatarUrl,
                status: seller.status,
                isBanned: seller.isBanned,
                isDeactivated: seller.isDeactivated,
                emailVerified: seller.emailVerified,
                createdAt: seller.createdAt,
                updatedAt: seller.updatedAt,
            },
            verification: verificationsData[0] || null,
            shop: shopData,
            profileCompletion,
        });
    } catch (error: any) {
        console.error("GET SELLER PROFILE ERROR:", {
            route: req.originalUrl,
            controller: "getSellerProfile",
            prismaCode: error?.code,
            message: error?.message,
            stack: error?.stack,
            requestBody: req.body,
            sellerId: req.sellerId
        });
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateSellerProfile = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;

        const {
            firstName,
            lastName,
            phone,
            avatarUrl,
            businessName,
            gstNumber,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country,
            bio,
        } = req.body;

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: { shop: true }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        const updatedSeller = await prisma.seller.update({
            where: { id: sellerId },
            data: {
                ...(firstName !== undefined && { firstName }),
                ...(lastName !== undefined && { lastName }),
                ...(phone !== undefined && { phone }),
                ...(avatarUrl !== undefined && { avatarUrl }),
            }
        });

        let updatedShop = null;
        if (seller.shop) {
            const shopData: any = {};
            if (businessName !== undefined) shopData.businessName = businessName;
            if (gstNumber !== undefined) shopData.gstNumber = gstNumber;

            if (Object.keys(shopData).length > 0) {
                updatedShop = await prisma.shop.update({
                    where: { sellerId },
                    data: shopData,
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        status: true,
                        rejectionReason: true,
                        businessName: true,
                        gstNumber: true,
                        gstRegistered: true,
                    }
                });
            } else {
                updatedShop = seller.shop;
            }
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            seller: {
                id: updatedSeller.id,
                username: updatedSeller.username,
                email: updatedSeller.email,
                firstName: updatedSeller.firstName,
                lastName: updatedSeller.lastName,
                phone: updatedSeller.phone,
                avatarUrl: updatedSeller.avatarUrl,
            },
            shop: updatedShop,
        });
    } catch (error) {
        console.error("UPDATE SELLER PROFILE ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const submitSellerVerification = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const {
            documentType,
            documentUrl,
            fileName,
            gstNumber,
            gstRegistered
        } = req.body;

        const isGstRegistered = gstRegistered === undefined ? (!!gstNumber) : (!!gstRegistered);
        let cleanGst: string | null = null;
        if (isGstRegistered && gstNumber) {
            const validatedGst = String(gstNumber).trim().toUpperCase();
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstRegex.test(validatedGst)) {
                return res.status(400).json({
                    message: "Invalid GST Number format. Must be a valid 15-character Indian GSTIN."
                });
            }
            cleanGst = validatedGst;
        }

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: { shop: true }
        });
        if (!seller) return res.status(404).json({ message: "Seller not found" });

        const verification = await prisma.$transaction(async (tx) => {
            const existing = await tx.sellerVerification.findFirst({
                where: { sellerId, isCurrent: true },
                orderBy: { updatedAt: "desc" }
            });

            if (existing) {
                // If existing is PENDING or UNDER_REVIEW: idempotent update
                if (existing.status === "PENDING" || existing.status === "UNDER_REVIEW") {
                    const updated = await tx.sellerVerification.update({
                        where: { id: existing.id },
                        data: {
                            documentType: documentType || existing.documentType,
                            documentUrl: documentUrl !== undefined ? documentUrl : existing.documentUrl,
                            fileName: fileName !== undefined ? fileName : existing.fileName,
                            gstNumber: cleanGst !== null ? cleanGst : existing.gstNumber,
                            gstRegistered: isGstRegistered,
                            submittedAt: new Date()
                        }
                    });
                    return updated;
                }

                // If existing is REJECTED or EXPIRED: archive previous, create new version
                if (existing.status === "REJECTED" || existing.status === "EXPIRED") {
                    await tx.sellerVerification.update({
                        where: { id: existing.id },
                        data: { isCurrent: false }
                    });

                    const newRecord = await tx.sellerVerification.create({
                        data: {
                            sellerId,
                            documentType: documentType || existing.documentType,
                            documentUrl: documentUrl || existing.documentUrl,
                            fileName: fileName || existing.fileName,
                            gstNumber: cleanGst !== null ? cleanGst : existing.gstNumber,
                            gstRegistered: isGstRegistered,
                            status: "PENDING",
                            isCurrent: true,
                            version: (existing.version || 1) + 1,
                            submittedAt: new Date()
                        }
                    });
                    return newRecord;
                }

                // If APPROVED and updating GST: archive and create new version
                if (existing.status === "APPROVED") {
                    if (cleanGst && cleanGst !== existing.gstNumber) {
                        await tx.sellerVerification.update({
                            where: { id: existing.id },
                            data: { isCurrent: false }
                        });
                        const newRecord = await tx.sellerVerification.create({
                            data: {
                                sellerId,
                                documentType: documentType || existing.documentType,
                                documentUrl: documentUrl || existing.documentUrl,
                                fileName: fileName || existing.fileName,
                                gstNumber: cleanGst,
                                gstRegistered: isGstRegistered,
                                status: "PENDING",
                                isCurrent: true,
                                version: (existing.version || 1) + 1,
                                submittedAt: new Date()
                            }
                        });
                        return newRecord;
                    }
                    return existing;
                }
            }

            // No existing verification: create first record
            return await tx.sellerVerification.create({
                data: {
                    sellerId,
                    documentType: documentType || null,
                    documentUrl: documentUrl || null,
                    fileName: fileName || null,
                    gstNumber: cleanGst,
                    gstRegistered: isGstRegistered,
                    status: "PENDING",
                    isCurrent: true,
                    version: 1,
                    submittedAt: new Date()
                }
            });
        });

        // Sync to shop if applicable
        if (seller.shop && cleanGst) {
            await prisma.shop.update({
                where: { id: seller.shop.id },
                data: {
                    gstRegistered: isGstRegistered,
                    gstNumber: cleanGst
                }
            });
        }

        return res.status(200).json({
            message: "Verification submitted successfully",
            verification
        });
    } catch (error: any) {
        console.error("SUBMIT SELLER VERIFICATION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
