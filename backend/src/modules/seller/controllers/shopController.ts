import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../../../config/prisma.js";
import { SellerOrderStatus, SellerAddressType } from "@prisma/client";
import { invalidatePublicCache } from "../../../middleware/cache.js";


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
            state,
            postalCode,
            country,
            gstRegistered,
            gstNumber
        } = req.body;

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

        // Get all active cities in the selected state
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

        // Fetch settings config
        const marketplaceSetting = await prisma.marketplaceSetting.findUnique({ where: { id: 1 } });
        const settingsData = marketplaceSetting?.data as any;
        const districtRequired = settingsData?.districtRequired !== false; // default to true

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
                            addressLine1,
                            addressLine2,

                            city,
                            state,
                            postalCode,
                            country,

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




export const addBankAccountDetails = async (req: Request,res: Response) => {
    try {

        const sellerId = req.sellerId!;

        const {
            accountHolderName,
            bankName,
            accountNumber,
            ifscCode,
            upiId
        } = req.body;

        if (
            !accountHolderName ||
            !bankName ||
            !accountNumber ||
            !ifscCode
        ) {
            return res.status(400).json({
                message: "Missing required bank details"
            });
        }

        const seller = await prisma.seller.findUnique({
            where: {
                id: sellerId
            },
            include: {
                shop: true
            }
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

        if (
            !seller.shop ||
            seller.shop.status !== "APPROVED"
        ) {
            return res.status(403).json({
                message:
                    "Shop approval required before adding bank account"
            });
        }

        const existingAccount =
            await prisma.sellerBankAccount.findFirst({
                where: {
                    sellerId
                }
            });

        if (existingAccount) {
            return res.status(400).json({
                message:
                    "Bank account already exists. Use update endpoint."
            });
        }

        const bankAccount =
            await prisma.sellerBankAccount.create({
                data: {
                    sellerId,
                    accountHolderName,
                    bankName,
                    accountNumber,
                    ifscCode,
                    upiId,
                    isDefault: true,
                    isVerified: false
                }
            });

        return res.status(201).json({
            message:
                "Bank account added successfully",
            bankAccount
        });

    } catch (error) {

        console.error(
            "ADD BANK ACCOUNT ERROR:",
            error
        );

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getBankAccountDetails = async (req: Request,res: Response) => {
    try {

        const sellerId = req.sellerId!;

        const bankAccount =
            await prisma.sellerBankAccount.findMany({
                where: {
                    sellerId
                }
            });

        return res.status(200).json({
            bankAccount
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
            state,
            postalCode,
            country,
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

        const result = await prisma.$transaction(async (tx) => {
            const updatedShop = await tx.shop.update({
                where: { sellerId },
                data: {
                    name: shopName ?? undefined,
                    description: description ?? undefined,
                    supportPhone: phone ?? undefined,
                }
            });

            if (shop.defaultPickupAddressId) {
                await tx.sellerAddress.update({
                    where: { id: shop.defaultPickupAddressId },
                    data: {
                        phone: phone ?? undefined,
                        addressLine1: addressLine1 ?? undefined,
                        addressLine2: addressLine2 ?? null,
                        city: city ?? undefined,
                        state: state ?? undefined,
                        postalCode: postalCode ?? undefined,
                        country: country ?? undefined,
                    }
                });
            }

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
        const { reason, supportingNotes } = req.body;

        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({
                message: "Reason is required"
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


