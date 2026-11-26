import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../../../config/prisma.js";
import { SellerOrderStatus, SellerAddressType } from "@prisma/client";
import { invalidatePublicCache } from "../../../middleware/cache.js";
import { ServiceabilityService } from "../../../services/location/serviceability.service.js";

export const validateCoordinatePair = (latitude: any, longitude: any): { valid: boolean; message?: string; lat: number | null; lng: number | null } => {
    const latProvided = latitude !== undefined && latitude !== null && String(latitude).trim() !== '';
    const lngProvided = longitude !== undefined && longitude !== null && String(longitude).trim() !== '';

    if (!latProvided && !lngProvided) {
        return { valid: true, lat: null, lng: null };
    }

    if (!latProvided || !lngProvided) {
        return { valid: false, message: "Both latitude and longitude must be provided together, or both must be empty.", lat: null, lng: null };
    }

    const nLat = Number(latitude);
    const nLng = Number(longitude);

    if (isNaN(nLat) || isNaN(nLng)) {
        return { valid: false, message: "Latitude and longitude must be valid numeric values.", lat: null, lng: null };
    }

    if (nLat < -90 || nLat > 90) {
        return { valid: false, message: "Latitude must be between -90 and 90.", lat: null, lng: null };
    }

    if (nLng < -180 || nLng > 180) {
        return { valid: false, message: "Longitude must be between -180 and 180.", lat: null, lng: null };
    }

    return { valid: true, lat: nLat, lng: nLng };
};


export const createShop = async (req: Request,res: Response) => {
    try {
        const sellerId = req.sellerId!;

        const {
            shopName,
            slug,
            description,

            type,
            label,
            contactName,

            phone,
            addressLine1,
            addressLine2,
            city,
            district,
            state,
            postalCode,
            country,
            latitude,
            longitude,
            formattedAddress,
            placeId,
            doorNo,
            buildingName,
            street,
            cross,
            area,
            landmark,
            locationSource,
            accuracyMeters,
            gstRegistered,
            gstNumber
        } = req.body;

        // Structured Indian address derivation
        const effectiveDoorNo = typeof doorNo === "string" ? doorNo.trim() : "";
        const effectiveBuilding = typeof buildingName === "string" ? buildingName.trim() : "";
        const effectiveStreet = typeof street === "string" ? street.trim() : "";
        const effectiveCross = typeof cross === "string" ? cross.trim() : "";
        const effectiveArea = typeof area === "string" ? area.trim() : "";
        const effectiveLandmark = typeof landmark === "string" ? landmark.trim() : "";

        const line1Parts: string[] = [];
        if (effectiveDoorNo) line1Parts.push(effectiveDoorNo);
        if (effectiveBuilding && !effectiveDoorNo.includes(effectiveBuilding)) line1Parts.push(effectiveBuilding);
        if (effectiveStreet && !line1Parts.includes(effectiveStreet)) line1Parts.push(effectiveStreet);
        const derivedAddressLine1 = line1Parts.length > 0 ? line1Parts.join(", ") : (addressLine1?.trim() || "");

        const line2Parts: string[] = [];
        if (effectiveCross) line2Parts.push(effectiveCross);
        if (effectiveArea && !derivedAddressLine1.includes(effectiveArea)) line2Parts.push(effectiveArea);
        if (effectiveLandmark && !derivedAddressLine1.includes(effectiveLandmark)) line2Parts.push(`Near ${effectiveLandmark}`);
        const derivedAddressLine2 = line2Parts.length > 0 ? line2Parts.join(", ") : (addressLine2?.trim() || null);

        const fullAddrParts: string[] = [];
        if (derivedAddressLine1) fullAddrParts.push(derivedAddressLine1);
        if (derivedAddressLine2) fullAddrParts.push(derivedAddressLine2);
        if (city?.trim()) fullAddrParts.push(city.trim());
        if (district?.trim() && district.trim().toLowerCase() !== city?.trim().toLowerCase()) fullAddrParts.push(district.trim());
        if (state?.trim() && postalCode?.trim()) fullAddrParts.push(`${state.trim()} - ${postalCode.trim()}`);
        else if (state?.trim()) fullAddrParts.push(state.trim());
        fullAddrParts.push(country?.trim() || "India");
        const derivedFormatted = formattedAddress?.trim() || fullAddrParts.join(", ");

        // Validate 6-digit Indian PIN code
        if (postalCode) {
            const cleanPin = String(postalCode).replace(/\D/g, "");
            if (cleanPin.length !== 6 || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
                return res.status(400).json({
                    message: "Invalid PIN code. Must be a valid 6-digit Indian postal PIN code."
                });
            }
        }

        // Map/normalize type to SellerAddressType enum
        let addressType: SellerAddressType = SellerAddressType.PICKUP;
        if (type) {
            const normalized = String(type).trim().toUpperCase();
            if (normalized === 'STORE' || normalized === 'SHOP' || normalized === 'PICKUP') {
                addressType = SellerAddressType.PICKUP;
            } else if (normalized === 'WAREHOUSE') {
                addressType = SellerAddressType.WAREHOUSE;
            } else if (normalized === 'RETURN') {
                addressType = SellerAddressType.RETURN;
            } else if (normalized === 'BUSINESS') {
                addressType = SellerAddressType.BUSINESS;
            } else if (normalized === 'REGISTERED_OFFICE') {
                addressType = SellerAddressType.REGISTERED_OFFICE;
            } else if (normalized === 'OTHER') {
                addressType = SellerAddressType.OTHER;
            }
        }

        if (
            !shopName ||
            !slug ||
            !phone ||
            !addressLine1 ||
            !state ||
            !postalCode ||
            !country
        ) {
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        if (country.trim().toLowerCase() !== "india") {
            return res.status(400).json({
                message: "The marketplace only operates in India"
            });
        }

        const isGstRegistered = gstRegistered === undefined ? (!!gstNumber) : (!!gstRegistered);
        let cleanGst: string | null = null;
        if (isGstRegistered) {
            if (!gstNumber || !gstNumber.trim()) {
                return res.status(400).json({
                    message: "GST Number is required when GST registered is selected."
                });
            }
            const validatedGst = gstNumber.trim().toUpperCase();
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstRegex.test(validatedGst)) {
                return res.status(400).json({
                    message: "Invalid GST Number format. Must be a valid 15-character Indian GSTIN."
                });
            }
            cleanGst = validatedGst;
        }

        // Verify seller registration location is serviceable using the authoritative serviceability engine
        const serviceabilityResult = await ServiceabilityService.checkServiceability({
            state: state.trim(),
            district: (district || city)?.trim(),
            city: city?.trim(),
            postalCode: postalCode?.trim(),
            latitude: latitude !== undefined && latitude !== null ? Number(latitude) : undefined,
            longitude: longitude !== undefined && longitude !== null ? Number(longitude) : undefined,
            userRole: "SELLER"
        });

        if (!serviceabilityResult.isServiceable) {
            return res.status(400).json({
                message: serviceabilityResult.message || `We do not currently operate seller services in ${city || district}, ${state}`
            });
        }

        const seller = await prisma.seller.findUnique({
            where: {
                id: sellerId
            }
        });

        if (!seller) {
            return res.status(404).json({
                message: "Seller not found"
            });
        }

        const existingShop = await prisma.shop.findUnique({
            where: {
                sellerId
            }
        });

        if (existingShop) {
            return res.status(400).json({
                message: "Seller already has a shop"
            });
        }

        if(seller.isBanned) {
            return res.status(400).json(({
                message :" Seller account is banned"
            }))
        }

        const normalizedSlug = slug
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-");

        const existingSlug = await prisma.shop.findUnique({
            where: {
                slug: normalizedSlug
            }
        });

        if (existingSlug) {
            return res.status(400).json({
                message: "Shop slug already exists"
            });
        }

        const coordValidation = validateCoordinatePair(latitude, longitude);
        if (!coordValidation.valid) {
            return res.status(400).json({
                message: coordValidation.message
            });
        }
        const validLat = coordValidation.lat;
        const validLng = coordValidation.lng;

        const result = await prisma.$transaction(
            async (tx) => {

                const address =
                    await tx.sellerAddress.create({
                        data: {
                            sellerId,

                            fullName:
                                `${seller.firstName} ${seller.lastName}`.trim(),

                            contactName:
                                contactName ??
                                `${seller.firstName} ${seller.lastName}`.trim(),

                            type: addressType,
                            label,

                            phone,
                            addressLine1: derivedAddressLine1 || addressLine1,
                            addressLine2: derivedAddressLine2,

                            city,
                            district: district || city,
                            state,
                            postalCode,
                            country,

                            latitude: validLat,
                            longitude: validLng,
                            formattedAddress: derivedFormatted,
                            placeId: placeId?.trim() || null,

                            doorNo: effectiveDoorNo || null,
                            buildingName: effectiveBuilding || null,
                            street: effectiveStreet || null,
                            cross: effectiveCross || null,
                            area: effectiveArea || null,
                            landmark: effectiveLandmark || null,
                            locationSource: locationSource || (validLat && validLng ? "GPS_DETECTED" : "MANUALLY_ENTERED"),
                            accuracyMeters: accuracyMeters !== undefined && accuracyMeters !== null ? Number(accuracyMeters) : null,

                            isDefault: true
                        }
                    });

                const shop =
                    await tx.shop.create({
                        data: {
                            sellerId,

                            name: shopName,
                            slug: normalizedSlug,
                            description,

                            supportEmail: seller.email,
                            supportPhone: phone,

                            defaultPickupAddressId:
                                address.id,

                            status: "PENDING",
                            gstRegistered: isGstRegistered,
                            gstNumber: cleanGst
                        }
                    });

                const approvalRequest = await tx.shopApprovalRequest.create({
                    data: {
                        shopId: shop.id,
                        sellerId,
                        status: "PENDING_REVIEW",
                        notes: "Initial shop onboarding registration",
                        submittedAt: new Date()
                    }
                });

                await tx.notification.create({
                    data: {
                        type: "SHOP_APPROVAL_REQUESTED",
                        channel: "IN_APP",
                        status: "PENDING",
                        title: `New Shop Approval Request: ${shop.name}`,
                        body: `Seller ${seller.firstName} ${seller.lastName} registered shop '${shop.name}' and submitted it for approval.`,
                        data: {
                            link: `/shops/${shop.id}`,
                            shopId: shop.id,
                            requestId: approvalRequest.id
                        },
                        sentAt: new Date()
                    }
                });

                return {
                    shop,
                    address,
                    approvalRequest
                };
            }
        );

        return res.status(201).json({
            message: "Shop created successfully",
            shop: result.shop,
            address: result.address
        });

    } catch (error: any) {
        const bodyToLog = { ...req.body };
        const secretKeys = ['password', 'token', 'secret', 'key', 'credential', 'auth'];
        for (const k of Object.keys(bodyToLog)) {
            if (secretKeys.some(s => k.toLowerCase().includes(s))) {
                bodyToLog[k] = '[REDACTED]';
            }
        }
        console.error("CREATE SHOP ERROR:", {
            route: req.originalUrl,
            controller: "createShop",
            prismaCode: error?.code,
            message: error?.message,
            stack: error?.stack,
            requestBody: bodyToLog,
            sellerId: req.sellerId
        });

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getShopInfo = async (req: Request , res:Response) =>   {
    try {

        const sellerId = req.sellerId!;

        const shop = await prisma.shop.findUnique({
            where: {
                sellerId
            },
            include: {
                defaultPickupAddress: true,
                packingFeeRequests: {
                    orderBy: {
                        createdAt: "desc"
                    },
                    take: 1
                },
                approvalRequests: {
                    orderBy: {
                        createdAt: "desc"
                    },
                    take: 1,
                    include: {
                        agreements: {
                            orderBy: {
                                version: "desc"
                            }
                        }
                    }
                },
                agreements: {
                    orderBy: {
                        version: "desc"
                    },
                    take: 1
                }
            }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        return res.status(200).json({
            shop
        });

    } catch (error) {

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}




const maskAccountNumber = (accNum?: string | null): string => {
    if (!accNum) return "";
    const clean = accNum.trim();
    if (clean.length <= 4) return clean;
    return `••••${clean.slice(-4)}`;
};

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUM_REGEX = /^[0-9]{9,18}$/;

export const addBankAccountDetails = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const {
            accountHolderName,
            bankName,
            accountNumber,
            ifscCode,
            upiId,
            isDefault
        } = req.body;

        if (
            !accountHolderName?.trim() ||
            !bankName?.trim() ||
            !accountNumber?.trim() ||
            !ifscCode?.trim()
        ) {
            return res.status(400).json({
                message: "Account holder name, bank name, account number, and IFSC code are required"
            });
        }

        const trimmedAccNum = accountNumber.trim();
        const trimmedIfsc = ifscCode.trim().toUpperCase();

        if (!ACCOUNT_NUM_REGEX.test(trimmedAccNum)) {
            return res.status(400).json({
                message: "Invalid account number. Must be between 9 and 18 digits."
            });
        }

        if (!IFSC_REGEX.test(trimmedIfsc)) {
            return res.status(400).json({
                message: "Invalid IFSC code format. Must be 11 characters (e.g. HDFC0001234)."
            });
        }

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: { shop: true }
        });

        if (!seller) {
            return res.status(404).json({
                message: "Seller not found"
            });
        }

        if (seller.isBanned) {
            return res.status(403).json({
                message: "Seller account is banned"
            });
        }

        if (!seller.shop || seller.shop.status !== "APPROVED") {
            return res.status(403).json({
                message: "Shop approval required before adding bank account"
            });
        }

        // Check for active duplicate account number for this seller
        const duplicateAccount = await prisma.sellerBankAccount.findFirst({
            where: {
                sellerId,
                accountNumber: trimmedAccNum,
                deletedAt: null
            }
        });

        if (duplicateAccount) {
            return res.status(400).json({
                message: "This bank account number is already linked to your store."
            });
        }

        const existingCount = await prisma.sellerBankAccount.count({
            where: { sellerId, deletedAt: null }
        });

        // First active account is default by default; otherwise respect isDefault flag
        const shouldBeDefault = existingCount === 0 || isDefault === true;

        if (shouldBeDefault && existingCount > 0) {
            await prisma.sellerBankAccount.updateMany({
                where: { sellerId, deletedAt: null },
                data: { isDefault: false }
            });
        }

        const bankAccount = await prisma.sellerBankAccount.create({
            data: {
                sellerId,
                accountHolderName: accountHolderName.trim(),
                bankName: bankName.trim(),
                accountNumber: trimmedAccNum,
                ifscCode: trimmedIfsc,
                upiId: upiId?.trim() || null,
                isDefault: shouldBeDefault,
                isVerified: false
            }
        });

        return res.status(201).json({
            message: "Bank account added successfully",
            bankAccount: {
                ...bankAccount,
                maskedAccountNumber: maskAccountNumber(bankAccount.accountNumber),
                accountNumber: maskAccountNumber(bankAccount.accountNumber)
            }
        });
    } catch (error) {
        console.error("ADD BANK ACCOUNT ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const updateBankAccountDetails = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const id = String(req.params.id);
        const {
            accountHolderName,
            bankName,
            accountNumber,
            ifscCode,
            upiId
        } = req.body;

        const existingAccount = await prisma.sellerBankAccount.findFirst({
            where: { id, sellerId, deletedAt: null }
        });

        if (!existingAccount) {
            return res.status(404).json({
                message: "Bank account not found or does not belong to your shop"
            });
        }

        const updateData: any = {};

        if (accountHolderName !== undefined) {
            if (!accountHolderName.trim()) {
                return res.status(400).json({ message: "Account holder name cannot be empty" });
            }
            updateData.accountHolderName = accountHolderName.trim();
        }

        if (bankName !== undefined) {
            if (!bankName.trim()) {
                return res.status(400).json({ message: "Bank name cannot be empty" });
            }
            updateData.bankName = bankName.trim();
        }

        if (upiId !== undefined) {
            updateData.upiId = upiId.trim() || null;
        }

        let materialChange = false;

        // If new unmasked account number supplied and differs
        if (
            accountNumber &&
            typeof accountNumber === "string" &&
            !accountNumber.includes("•") &&
            !accountNumber.includes("*")
        ) {
            const cleanAcc = accountNumber.trim();
            if (cleanAcc !== existingAccount.accountNumber) {
                if (!ACCOUNT_NUM_REGEX.test(cleanAcc)) {
                    return res.status(400).json({
                        message: "Invalid account number. Must be between 9 and 18 digits."
                    });
                }
                updateData.accountNumber = cleanAcc;
                materialChange = true;
            }
        }

        // If IFSC supplied and differs
        if (ifscCode && typeof ifscCode === "string") {
            const cleanIfsc = ifscCode.trim().toUpperCase();
            if (cleanIfsc !== existingAccount.ifscCode?.toUpperCase()) {
                if (!IFSC_REGEX.test(cleanIfsc)) {
                    return res.status(400).json({
                        message: "Invalid IFSC code format. Must be 11 characters (e.g. HDFC0001234)."
                    });
                }
                updateData.ifscCode = cleanIfsc;
                materialChange = true;
            }
        }

        // Material changes to account number or IFSC reset verification status
        if (materialChange) {
            updateData.isVerified = false;
        }

        const updated = await prisma.sellerBankAccount.update({
            where: { id },
            data: updateData
        });

        return res.status(200).json({
            message: "Bank account details updated successfully",
            bankAccount: {
                ...updated,
                maskedAccountNumber: maskAccountNumber(updated.accountNumber),
                accountNumber: maskAccountNumber(updated.accountNumber)
            }
        });
    } catch (error) {
        console.error("UPDATE BANK ACCOUNT ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const deleteBankAccountDetails = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const id = String(req.params.id);

        const targetAccount = await prisma.sellerBankAccount.findFirst({
            where: { id, sellerId, deletedAt: null }
        });

        if (!targetAccount) {
            return res.status(404).json({
                message: "Bank account not found or does not belong to your shop"
            });
        }

        // If there are pending/processing payouts referencing this bank account,
        // mark them as awaiting valid bank details (do not mark as paid or silently redirect)
        await prisma.sellerPayout.updateMany({
            where: {
                bankAccountId: id,
                status: { in: ["PENDING", "PROCESSING"] }
            },
            data: {
                bankAccountId: null,
                failureReason: "Awaiting valid bank details: Linked settlement account was removed."
            }
        });

        // Soft-delete the bank account:
        // 1. Removes it from active seller account listings (allowing empty account list if only account).
        // 2. Preserves historical completed payout records & references for audits and compliance.
        // 3. Does not automatically create or select any replacement account.
        await prisma.sellerBankAccount.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                isDefault: false
            }
        });

        return res.status(200).json({
            message: "Bank account removed successfully"
        });
    } catch (error) {
        console.error("DELETE BANK ACCOUNT ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const setDefaultBankAccount = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const id = String(req.params.id);

        const targetAccount = await prisma.sellerBankAccount.findFirst({
            where: { id, sellerId, deletedAt: null }
        });

        if (!targetAccount) {
            return res.status(404).json({
                message: "Bank account not found or does not belong to your shop"
            });
        }

        await prisma.$transaction([
            prisma.sellerBankAccount.updateMany({
                where: { sellerId, deletedAt: null },
                data: { isDefault: false }
            }),
            prisma.sellerBankAccount.update({
                where: { id },
                data: { isDefault: true }
            })
        ]);

        const updated = await prisma.sellerBankAccount.findUnique({
            where: { id }
        });

        return res.status(200).json({
            message: "Default settlement bank account updated successfully",
            bankAccount: updated ? {
                ...updated,
                maskedAccountNumber: maskAccountNumber(updated.accountNumber),
                accountNumber: maskAccountNumber(updated.accountNumber)
            } : null
        });
    } catch (error) {
        console.error("SET DEFAULT BANK ACCOUNT ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getBankAccountDetails = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;

        const bankAccounts = await prisma.sellerBankAccount.findMany({
            where: { sellerId, deletedAt: null },
            orderBy: [
                { isDefault: "desc" },
                { createdAt: "desc" }
            ]
        });

        const maskedBankAccounts = bankAccounts.map((account) => ({
            ...account,
            maskedAccountNumber: maskAccountNumber(account.accountNumber),
            accountNumber: maskAccountNumber(account.accountNumber)
        }));

        return res.status(200).json({
            bankAccount: maskedBankAccounts,
            bankAccounts: maskedBankAccounts
        });
    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const raiseBanIssue = async(req:Request , res:Response) => {
    try {

        const sellerId = req.sellerId!;
        const { subject, description } = req.body;

        if (!subject || !description) {
            return res.status(400).json({
                message: "Subject and description are required"
            });
        }

        const seller = await prisma.seller.findUnique({
            where: {
                id: sellerId
            }
        });

        if (!seller) {
            return res.status(404).json({
                message: "Seller not found"
            });
        }

        if (!seller.isBanned) {
            return res.status(400).json({
                message: "Seller is not banned"
            });
        }

        const ticket =
            await prisma.supportTicket.create({
                data: {
                    sellerId,
                    subject,
                    description
                }
            });

        return res.status(201).json({
            message:
                "Ban appeal submitted successfully",
            ticket
        });

    } catch (error) {

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}

export const deleteShop = async (req: Request, res: Response) => {
    try {

        const sellerId = req.sellerId!;

        const shop = await prisma.shop.findUnique({
            where: {
                sellerId
            }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        const pendingOrders =
            await prisma.sellerOrder.count({
                where: {
                    sellerId,
                    status: {
                        in: [
                            "PENDING",
                            "ACCEPTED",
                            "PROCESSING",
                            "READY_TO_SHIP",
                            "SHIPPED"
                        ]
                    }
                }
            });

        if (pendingOrders > 0) {
            return res.status(400).json({
                message:
                    "Cannot delete shop while active orders exist"
            });
        }

        await prisma.shop.delete({
            where: {
                sellerId
            }
        });

        return res.status(200).json({
            message:
                "Shop deleted successfully"
        });

    } catch (error) {

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const updateShopBanner = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const { bannerUrl } = req.body;
        if (!bannerUrl?.trim()) {
            return res.status(400).json({
                message: "Banner URL is required"
            });
        }

        const shop = await prisma.shop.findUnique({
            where: {
                sellerId
            }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        const updatedShop = await prisma.shop.update({
            where: {
                sellerId
            },
            data: {
                bannerUrl: bannerUrl.trim()
            }
        });

        return res.status(200).json({
            message: "Shop banner updated successfully",
            shop: updatedShop
        });

    } catch (error) {
        console.error("UPDATE SHOP BANNER ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const updateShopLogo = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const { logoUrl } = req.body;
        if (!logoUrl?.trim()) {
            return res.status(400).json({
                message: "Logo URL is required"
            });
        }

        const shop = await prisma.shop.findUnique({
            where: {
                sellerId
            }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        const updatedShop = await prisma.shop.update({
            where: {
                sellerId
            },
            data: {
                logoUrl: logoUrl.trim()
            }
        });

        return res.status(200).json({
            message: "Shop logo updated successfully",
            shop: updatedShop
        });

    } catch (error) {
        console.error("UPDATE SHOP LOGO ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

const ALL_INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

export const getActiveStates = async (req: Request, res: Response) => {
    try {
        const dbStates = await prisma.state.findMany({
            orderBy: { name: "asc" }
        });
        
        const allStates = dbStates.map(s => ({
            name: s.name,
            isEnabled: s.isActive
        }));
        
        const states = dbStates.filter(s => s.isActive).map(s => s.name);
        
        // Get settings
        const settingsRow = await prisma.marketplaceSetting.findUnique({ where: { id: 1 } });
        const settings = settingsRow?.data as any;
        const districtRequired = settings?.districtRequired !== false;
        
        return res.status(200).json({ states, allStates, districtRequired });
    } catch (error: any) {
        console.error("GET ACTIVE STATES ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getActiveDistricts = async (req: Request, res: Response) => {
    try {
        const { state } = req.query;
        if (!state) {
            return res.status(400).json({ message: "State query parameter is required" });
        }
        
        const cities = await prisma.city.findMany({
            where: {
                state: { equals: String(state).trim(), mode: "insensitive" }
            },
            orderBy: { name: "asc" }
        });
        
        const districts = cities.filter(c => c.isActive).map(c => c.name);
        const allDistricts = cities.map(c => ({
            name: c.name,
            isEnabled: c.isActive
        }));
        
        return res.status(200).json({ districts, allDistricts });
    } catch (error: any) {
        console.error("GET ACTIVE DISTRICTS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateShop = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const {
            shopName,
            description,
            phone,
            addressLine1,
            addressLine2,
            city,
            district,
            state,
            postalCode,
            country,
            latitude,
            longitude,
            formattedAddress,
            placeId,
            doorNo,
            buildingName,
            street,
            cross,
            area,
            landmark,
            locationSource,
            accuracyMeters,
        } = req.body;

        const shop = await prisma.shop.findUnique({
            where: { sellerId },
            include: { defaultPickupAddress: true }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        if (country && country.trim().toLowerCase() !== "india") {
            return res.status(400).json({
                message: "The marketplace only operates in India"
            });
        }

        // Validate 6-digit Indian postal PIN code
        if (postalCode) {
            const cleanPin = String(postalCode).replace(/\D/g, "");
            if (cleanPin.length !== 6 || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
                return res.status(400).json({
                    message: "Invalid PIN code. Must be a valid 6-digit Indian postal PIN code."
                });
            }
        }

        if (state) {
            const activeCitiesInState = await prisma.city.findMany({
                where: {
                    state: { equals: state.trim(), mode: "insensitive" },
                    isActive: true
                }
            });

            if (activeCitiesInState.length === 0) {
                return res.status(400).json({
                    message: `We do not operate in the state: ${state}`
                });
            }

            const marketplaceSetting = await prisma.marketplaceSetting.findUnique({ where: { id: 1 } });
            const settingsData = marketplaceSetting?.data as any;
            const districtRequired = settingsData?.districtRequired !== false;

            if (districtRequired) {
                if (!city || !city.trim()) {
                    return res.status(400).json({
                        message: "District is required"
                    });
                }
                const activeCity = activeCitiesInState.find(
                    c => c.name.toLowerCase() === city.trim().toLowerCase()
                );
                if (!activeCity) {
                    return res.status(400).json({
                        message: `We do not operate in district: ${city} of state: ${state}`
                    });
                }
            } else if (city && city.trim()) {
                const activeCity = activeCitiesInState.find(
                    c => c.name.toLowerCase() === city.trim().toLowerCase()
                );
                if (!activeCity) {
                    return res.status(400).json({
                        message: `We do not operate in district: ${city} of state: ${state}`
                    });
                }
            }
        }

        const effectiveDoorNo = typeof doorNo === "string" ? doorNo.trim() : (doorNo === null ? "" : undefined);
        const effectiveBuilding = typeof buildingName === "string" ? buildingName.trim() : (buildingName === null ? "" : undefined);
        const effectiveStreet = typeof street === "string" ? street.trim() : (street === null ? "" : undefined);
        const effectiveCross = typeof cross === "string" ? cross.trim() : (cross === null ? "" : undefined);
        const effectiveArea = typeof area === "string" ? area.trim() : (area === null ? "" : undefined);
        const effectiveLandmark = typeof landmark === "string" ? landmark.trim() : (landmark === null ? "" : undefined);

        let derivedAddressLine1: string | undefined = undefined;
        let derivedAddressLine2: string | undefined = undefined;

        if (effectiveDoorNo !== undefined || effectiveBuilding !== undefined || effectiveStreet !== undefined) {
            const line1Parts: string[] = [];
            const d = effectiveDoorNo ?? shop.defaultPickupAddress?.doorNo ?? "";
            const b = effectiveBuilding ?? shop.defaultPickupAddress?.buildingName ?? "";
            const s = effectiveStreet ?? shop.defaultPickupAddress?.street ?? "";
            if (d) line1Parts.push(d);
            if (b && !d.includes(b)) line1Parts.push(b);
            if (s && !line1Parts.includes(s)) line1Parts.push(s);
            if (line1Parts.length > 0) {
                derivedAddressLine1 = line1Parts.join(", ");
            }
        }

        if (effectiveCross !== undefined || effectiveArea !== undefined || effectiveLandmark !== undefined) {
            const line2Parts: string[] = [];
            const c = effectiveCross ?? shop.defaultPickupAddress?.cross ?? "";
            const a = effectiveArea ?? shop.defaultPickupAddress?.area ?? "";
            const l = effectiveLandmark ?? shop.defaultPickupAddress?.landmark ?? "";
            if (c) line2Parts.push(c);
            if (a) line2Parts.push(a);
            if (l) line2Parts.push(`Near ${l}`);
            if (line2Parts.length > 0) {
                derivedAddressLine2 = line2Parts.join(", ");
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            let updatedLat = shop.defaultPickupAddress?.latitude !== null && shop.defaultPickupAddress?.latitude !== undefined
                ? Number(shop.defaultPickupAddress.latitude)
                : null;
            let updatedLng = shop.defaultPickupAddress?.longitude !== null && shop.defaultPickupAddress?.longitude !== undefined
                ? Number(shop.defaultPickupAddress.longitude)
                : null;

            if (latitude !== undefined || longitude !== undefined) {
                const coordValidation = validateCoordinatePair(latitude, longitude);
                if (!coordValidation.valid) {
                    return res.status(400).json({
                        message: coordValidation.message
                    });
                }
                updatedLat = coordValidation.lat;
                updatedLng = coordValidation.lng;
            }

            if (shop.defaultPickupAddressId) {
                await tx.sellerAddress.update({
                    where: { id: shop.defaultPickupAddressId },
                    data: {
                        phone: phone ?? undefined,
                        addressLine1: derivedAddressLine1 ?? (addressLine1 ?? undefined),
                        addressLine2: derivedAddressLine2 !== undefined ? derivedAddressLine2 : (addressLine2 !== undefined ? (addressLine2?.trim() || null) : undefined),
                        city: city ?? undefined,
                        district: district ?? (city ?? undefined),
                        state: state ?? undefined,
                        postalCode: postalCode ?? undefined,
                        country: country ?? undefined,
                        latitude: updatedLat,
                        longitude: updatedLng,
                        formattedAddress: formattedAddress !== undefined ? (formattedAddress?.trim() || null) : undefined,
                        placeId: placeId !== undefined ? (placeId?.trim() || null) : undefined,
                        doorNo: effectiveDoorNo !== undefined ? (effectiveDoorNo || null) : undefined,
                        buildingName: effectiveBuilding !== undefined ? (effectiveBuilding || null) : undefined,
                        street: effectiveStreet !== undefined ? (effectiveStreet || null) : undefined,
                        cross: effectiveCross !== undefined ? (effectiveCross || null) : undefined,
                        area: effectiveArea !== undefined ? (effectiveArea || null) : undefined,
                        landmark: effectiveLandmark !== undefined ? (effectiveLandmark || null) : undefined,
                        locationSource: locationSource ?? undefined,
                        accuracyMeters: accuracyMeters !== undefined && accuracyMeters !== null ? Number(accuracyMeters) : undefined,
                    }
                });
            } else if (addressLine1 || derivedAddressLine1 || city || state) {
                const seller = await tx.seller.findUnique({ where: { id: sellerId } });
                const newAddr = await tx.sellerAddress.create({
                    data: {
                        sellerId,
                        fullName: seller ? `${seller.firstName} ${seller.lastName}`.trim() : "Shop Pickup",
                        contactName: seller ? `${seller.firstName} ${seller.lastName}`.trim() : "Shop Pickup",
                        type: SellerAddressType.PICKUP,
                        phone: phone || seller?.phone || "",
                        addressLine1: derivedAddressLine1 || addressLine1 || "",
                        addressLine2: derivedAddressLine2 || (addressLine2?.trim() || null),
                        city: city || "",
                        district: district || city || "",
                        state: state || "",
                        postalCode: postalCode || "",
                        country: country || "India",
                        latitude: updatedLat,
                        longitude: updatedLng,
                        formattedAddress: formattedAddress?.trim() || null,
                        placeId: placeId?.trim() || null,
                        doorNo: effectiveDoorNo || null,
                        buildingName: effectiveBuilding || null,
                        street: effectiveStreet || null,
                        cross: effectiveCross || null,
                        area: effectiveArea || null,
                        landmark: effectiveLandmark || null,
                        locationSource: locationSource || "MANUALLY_ENTERED",
                        accuracyMeters: accuracyMeters !== undefined && accuracyMeters !== null ? Number(accuracyMeters) : null,
                        isDefault: true,
                    }
                });
                await tx.shop.update({
                    where: { id: shop.id },
                    data: { defaultPickupAddressId: newAddr.id }
                });
            }

            const updatedShop = await tx.shop.update({
                where: { sellerId },
                data: {
                    name: shopName ?? undefined,
                    description: description ?? undefined,
                    supportPhone: phone ?? undefined,
                },
                include: {
                    defaultPickupAddress: true
                }
            });

            return updatedShop;
        });

        invalidatePublicCache();

        return res.status(200).json({
            message: "Shop updated successfully",
            shop: result
        });

    } catch (error) {
        console.error("UPDATE SHOP ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const requestPackingFeeApproval = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const { reason, supportingNotes, requestedMaxFee, maxFee } = req.body;

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({
                message: "Reason is required"
            });
        }

        const feeValue = requestedMaxFee !== undefined && requestedMaxFee !== null && String(requestedMaxFee).trim() !== ''
            ? requestedMaxFee
            : maxFee;

        if (feeValue === undefined || feeValue === null || String(feeValue).trim() === '') {
            return res.status(400).json({
                message: "Maximum packaging fee is required."
            });
        }

        const nFee = Number(feeValue);
        if (isNaN(nFee) || nFee <= 0) {
            return res.status(400).json({
                message: "Maximum packaging fee must be a valid positive amount."
            });
        }

        if (nFee > 500) {
            return res.status(400).json({
                message: "Maximum packaging fee cannot exceed ₹500.00."
            });
        }

        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        // Check if there is already a pending request
        const pendingRequest = await prisma.packingFeeRequest.findFirst({
            where: {
                shopId: shop.id,
                status: "PENDING"
            }
        });

        if (pendingRequest) {
            return res.status(400).json({
                message: "You already have a pending packing fee request under review."
            });
        }

        // Create new request and update shop in a transaction
        const request = await prisma.$transaction(async (tx) => {
            const req = await tx.packingFeeRequest.create({
                data: {
                    shopId: shop.id,
                    status: "PENDING",
                    reason: reason.trim(),
                    requestedMaxFee: nFee,
                    supportingNotes: supportingNotes ? supportingNotes.trim() : null
                }
            });

            await tx.shop.update({
                where: { id: shop.id },
                data: {
                    packingFeeApprovalStatus: "PENDING",
                    packingFeeRequestedAt: new Date(),
                    packingFeeRejectedReason: null
                }
            });

            return req;
        });

        return res.status(201).json({
            message: "Packing fee approval request submitted successfully",
            request
        });
    } catch (error: any) {
        console.error("REQUEST PACKING FEE APPROVAL ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const togglePackingFee = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const { enablePackingFee, packingFeeEnabled, packingFeeAmount } = req.body;

        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        // Check if shop is approved to charge packing fees
        if (shop.packingFeeApprovalStatus !== "APPROVED") {
            return res.status(403).json({
                message: "Only approved shops can configure packing fees."
            });
        }

        const isEnabled = packingFeeEnabled !== undefined ? !!packingFeeEnabled : (enablePackingFee !== undefined ? !!enablePackingFee : undefined);
        const amount = packingFeeAmount !== undefined ? Number(packingFeeAmount) : undefined;

        if (isEnabled && amount !== undefined) {
            if (amount < 0 || amount > 500) {
                return res.status(400).json({
                    message: "Packing fee amount must be between ₹0 and ₹500."
                });
            }
            if (shop.packingFeeApprovedMaxAmount !== null && shop.packingFeeApprovedMaxAmount !== undefined) {
                const maxApproved = Number(shop.packingFeeApprovedMaxAmount);
                if (amount > maxApproved) {
                    return res.status(400).json({
                        message: `Packing fee cannot exceed the admin-approved maximum of ₹${maxApproved.toFixed(2)}.`
                    });
                }
            }
        }

        const updateData: any = {};
        if (isEnabled !== undefined) {
            updateData.packingFeeEnabled = isEnabled;
            updateData.enablePackingFee = isEnabled; // backward compatibility
        }
        if (amount !== undefined) {
            updateData.packingFeeAmount = amount;
        }

        const updatedShop = await prisma.shop.update({
            where: { id: shop.id },
            data: updateData
        });

        return res.status(200).json({
            message: "Packing fee configuration updated successfully",
            shop: {
                id: updatedShop.id,
                name: updatedShop.name,
                enablePackingFee: updatedShop.enablePackingFee,
                packingFeeApproved: updatedShop.packingFeeApproved,
                packingFeeEnabled: updatedShop.packingFeeEnabled,
                packingFeeAmount: Number(updatedShop.packingFeeAmount),
                packingFeeApprovalStatus: updatedShop.packingFeeApprovalStatus
            }
        });
    } catch (error: any) {
        console.error("TOGGLE PACKING FEE ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const submitShopApprovalRequest = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const { notes } = req.body;

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: { shop: true }
        });

        if (!seller || !seller.shop) {
            return res.status(404).json({ message: "Shop not found. Please create a shop first." });
        }

        const shop = seller.shop;

        if (shop.status === "APPROVED") {
            return res.status(400).json({ message: "Shop is already approved and active." });
        }

        // Prevent duplicate active approval requests
        const activeRequest = await prisma.shopApprovalRequest.findFirst({
            where: {
                shopId: shop.id,
                status: {
                    in: ["PENDING_REVIEW", "AGREEMENT_ISSUED", "AGREEMENT_ACCEPTED", "AWAITING_FINAL_APPROVAL"]
                }
            }
        });

        if (activeRequest) {
            return res.status(400).json({
                message: "An active shop approval request is already in progress.",
                activeRequest
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            await tx.shop.update({
                where: { id: shop.id },
                data: {
                    status: "PENDING",
                    rejectionReason: null
                }
            });

            const request = await tx.shopApprovalRequest.create({
                data: {
                    shopId: shop.id,
                    sellerId,
                    status: "PENDING_REVIEW",
                    notes: typeof notes === "string" ? notes.trim() : null,
                    submittedAt: new Date()
                }
            });

            await tx.notification.create({
                data: {
                    type: "SHOP_APPROVAL_REQUESTED",
                    channel: "IN_APP",
                    status: "PENDING",
                    title: `Shop Approval Resubmission: ${shop.name}`,
                    body: `Seller ${seller.firstName} ${seller.lastName} submitted shop '${shop.name}' for approval.`,
                    data: { link: `/shops/${shop.id}`, shopId: shop.id, requestId: request.id },
                    sentAt: new Date()
                }
            });

            return request;
        });

        invalidatePublicCache();

        return res.status(201).json({
            message: "Shop approval request submitted successfully",
            request: result
        });
    } catch (error: any) {
        console.error("SUBMIT SHOP APPROVAL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getShopAgreement = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const shop = await prisma.shop.findUnique({
            where: { sellerId },
            include: {
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

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const latestAgreement = shop.agreements[0] || null;
        const latestRequest = shop.approvalRequests[0] || null;

        return res.status(200).json({
            shop: {
                id: shop.id,
                name: shop.name,
                status: shop.status,
                commissionPercentage: shop.commissionPercentage,
            },
            approvalRequest: latestRequest,
            agreement: latestAgreement
        });
    } catch (error: any) {
        console.error("GET SHOP AGREEMENT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const acceptShopAgreement = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const agreementId = String(req.params.agreementId);
        const { legalName, acceptanceMethod = "ELECTRONIC_SIGNATURE", signatureImageUrl } = req.body;

        if (!legalName || typeof legalName !== "string" || !legalName.trim()) {
            return res.status(400).json({ message: "Typed legal name is required for agreement acceptance." });
        }

        const agreement = await prisma.shopAgreement.findUnique({
            where: { id: agreementId },
            include: {
                shop: true,
                approvalRequest: true
            }
        });

        if (!agreement) {
            return res.status(404).json({ message: "Shop agreement not found." });
        }

        if (agreement.sellerId !== sellerId) {
            return res.status(403).json({ message: "You are not authorized to accept this agreement." });
        }

        if (agreement.status !== "ISSUED") {
            return res.status(400).json({
                message: `Agreement cannot be accepted. Current status is ${agreement.status}.`
            });
        }

        const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "Unknown";
        const documentHash = crypto
            .createHash("sha256")
            .update(`${agreement.content}|${legalName.trim()}|${agreement.version}`)
            .digest("hex");

        const result = await prisma.$transaction(async (tx) => {
            const updatedAgreement = await tx.shopAgreement.update({
                where: { id: agreementId },
                data: {
                    status: "ACCEPTED",
                    acceptedAt: new Date(),
                    acceptedLegalName: legalName.trim(),
                    acceptanceMethod,
                    signatureImageUrl: signatureImageUrl || null,
                    ipAddress: String(ip).slice(0, 45),
                    userAgent: String(userAgent).slice(0, 512),
                    documentHash
                }
            });

            await tx.shopApprovalRequest.update({
                where: { id: agreement.approvalRequestId },
                data: {
                    status: "AWAITING_FINAL_APPROVAL",
                    reviewedAt: new Date()
                }
            });

            // Notify Admin
            await tx.notification.create({
                data: {
                    type: "SHOP_AGREEMENT_ACCEPTED",
                    channel: "IN_APP",
                    status: "PENDING",
                    title: `Shop Agreement Accepted: ${agreement.shop.name}`,
                    body: `${legalName.trim()} accepted the seller agreement (v${agreement.version}) for '${agreement.shop.name}'. Shop is awaiting final approval.`,
                    data: {
                        link: `/shops/${agreement.shopId}`,
                        shopId: agreement.shopId,
                        agreementId: agreement.id
                    },
                    sentAt: new Date()
                }
            });

            return updatedAgreement;
        });

        invalidatePublicCache();

        return res.status(200).json({
            message: "Agreement accepted successfully. Your shop is now awaiting final administrative approval.",
            agreement: result
        });
    } catch (error: any) {
        console.error("ACCEPT SHOP AGREEMENT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const declineShopAgreement = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const agreementId = String(req.params.agreementId);
        const { reason } = req.body;

        if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
            return res.status(400).json({ message: "A decline reason of at least 5 characters is required." });
        }

        const agreement = await prisma.shopAgreement.findUnique({
            where: { id: agreementId },
            include: {
                shop: true,
                approvalRequest: true
            }
        });

        if (!agreement) {
            return res.status(404).json({ message: "Shop agreement not found." });
        }

        if (agreement.sellerId !== sellerId) {
            return res.status(403).json({ message: "You are not authorized to decline this agreement." });
        }

        if (agreement.status !== "ISSUED") {
            return res.status(400).json({
                message: `Agreement cannot be declined. Current status is ${agreement.status}.`
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const updatedAgreement = await tx.shopAgreement.update({
                where: { id: agreementId },
                data: {
                    status: "DECLINED",
                    declinedAt: new Date(),
                    declinedReason: reason.trim()
                }
            });

            await tx.shopApprovalRequest.update({
                where: { id: agreement.approvalRequestId },
                data: {
                    status: "AGREEMENT_DECLINED",
                    reviewedAt: new Date()
                }
            });

            // Notify Admin
            await tx.notification.create({
                data: {
                    type: "SHOP_AGREEMENT_DECLINED",
                    channel: "IN_APP",
                    status: "PENDING",
                    title: `Shop Agreement Declined: ${agreement.shop.name}`,
                    body: `The seller declined the issued agreement for '${agreement.shop.name}'. Reason: ${reason.trim()}`,
                    data: {
                        link: `/shops/${agreement.shopId}`,
                        shopId: agreement.shopId,
                        agreementId: agreement.id
                    },
                    sentAt: new Date()
                }
            });

            return updatedAgreement;
        });

        invalidatePublicCache();

        return res.status(200).json({
            message: "Agreement declined. Administration has been notified.",
            agreement: result
        });
    } catch (error: any) {
        console.error("DECLINE SHOP AGREEMENT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getShopAvailabilityController = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const shop = await prisma.shop.findUnique({
            where: { sellerId },
            select: { id: true, name: true }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const { ShopAvailabilityService } = await import("../../../services/shop/shopAvailability.service.js");
        const availability = await ShopAvailabilityService.getShopAvailability(shop.id);

        return res.status(200).json({ availability });
    } catch (error: any) {
        console.error("GET SHOP AVAILABILITY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateShopAvailabilityController = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const { isOnline, reason, force } = req.body;

        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        if (typeof isOnline !== "boolean") {
            return res.status(400).json({ message: "isOnline boolean field is required" });
        }

        const { ShopAvailabilityService } = await import("../../../services/shop/shopAvailability.service.js");
        const result = await ShopAvailabilityService.setManualAvailability({
            shopId: shop.id,
            isOnline,
            reason,
            actorType: "SELLER",
            actorId: sellerId,
            actorName: shop.name,
            force: Boolean(force)
        });

        if ((result as any).requiresConfirmation) {
            return res.status(200).json({
                requiresConfirmation: true,
                activeOrdersCount: (result as any).activeOrdersCount,
                message: (result as any).message
            });
        }

        invalidatePublicCache();
        return res.status(200).json(result);
    } catch (error: any) {
        console.error("UPDATE SHOP AVAILABILITY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const scheduleShopClosingController = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const { scheduledCloseAt, closingReason, timeZone } = req.body;

        if (!scheduledCloseAt) {
            return res.status(400).json({ message: "scheduledCloseAt timestamp is required" });
        }

        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const { ShopAvailabilityService } = await import("../../../services/shop/shopAvailability.service.js");
        const result = await ShopAvailabilityService.scheduleClosing({
            shopId: shop.id,
            scheduledCloseAt,
            closingReason,
            timeZone,
            actorId: sellerId,
            actorName: shop.name
        });

        invalidatePublicCache();
        return res.status(200).json(result);
    } catch (error: any) {
        console.error("SCHEDULE SHOP CLOSING ERROR:", error);
        return res.status(400).json({ message: error.message || "Invalid schedule data" });
    }
};

export const cancelScheduledClosingController = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const { ShopAvailabilityService } = await import("../../../services/shop/shopAvailability.service.js");
        const result = await ShopAvailabilityService.cancelScheduledClosing(shop.id, sellerId, shop.name);

        invalidatePublicCache();
        return res.status(200).json(result);
    } catch (error: any) {
        console.error("CANCEL SCHEDULED CLOSING ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};



