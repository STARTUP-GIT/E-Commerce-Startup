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
    } catch (error) {
        console.error("GET SELLER PROFILE ERROR:", error);
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
