import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { SellerOrderStatus, SellerAddressType } from "@prisma/client";


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
        const platformSetting = await prisma.platformSetting.findUnique({ where: { id: 1 } });
        const settingsData = platformSetting?.data as any;
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

                return {
                    shop,
                    address
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
                defaultPickupAddress: true
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
        const settingsRow = await prisma.platformSetting.findUnique({ where: { id: 1 } });
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
            country
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

            const platformSetting = await prisma.platformSetting.findUnique({ where: { id: 1 } });
            const settingsData = platformSetting?.data as any;
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


