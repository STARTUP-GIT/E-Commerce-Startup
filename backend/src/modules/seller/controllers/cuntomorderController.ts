import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

const serializeCustomOrder = (order: any) => {
    if (!order) return order;
    const serialized = { ...order };
    if (serialized.files) {
        serialized.files = serialized.files.map((file: any) => ({
            ...file,
            fileSizeBytes: typeof file.fileSizeBytes === "bigint" ? Number(file.fileSizeBytes) : file.fileSizeBytes
        }));
    }
    return serialized;
};

export const getCustomOrders = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const customOrders = await prisma.customOrder.findMany({
            where: {
                OR: [
                    {
                        status: {
                            in: ["SUBMITTED", "UNDER_REVIEW", "QUOTING", "QUOTED"]
                        }
                    },
                    {
                        quotes: {
                            some: {
                                sellerId
                            }
                        }
                    }
                ]
            },
            include: {
                files: true,
                quotes: {
                    where: {
                        sellerId
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        const serializedOrders = customOrders.map(serializeCustomOrder);

        return res.status(200).json({
            count: serializedOrders.length,
            customOrders: serializedOrders
        });

    } catch (error) {
        console.error("GET CUSTOM ORDERS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const seeCustomOrder = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const customOrderId = req.params.orderId || req.params.customOrderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!customOrderId) {
            return res.status(400).json({
                message: "Custom Order ID is required"
            });
        }

        const customOrder = await prisma.customOrder.findUnique({
            where: {
                id: customOrderId as string
            },
            include: {
                files: true,
                quotes: {
                    where: {
                        sellerId
                    }
                },
                timelineEvents: {
                    orderBy: {
                        createdAt: "asc"
                    }
                }
            }
        });

        if (!customOrder) {
            return res.status(404).json({
                message: "Custom order not found"
            });
        }

        return res.status(200).json({
            customOrder: serializeCustomOrder(customOrder)
        });

    } catch (error) {
        console.error("SEE CUSTOM ORDER ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const acceptCustomOrder = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const customOrderId = req.params.orderId || req.params.customOrderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!customOrderId) {
            return res.status(400).json({
                message: "Custom Order ID is required"
            });
        }

        const customOrder = await prisma.customOrder.findUnique({
            where: {
                id: customOrderId as string
            }
        });

        if (!customOrder) {
            return res.status(404).json({
                message: "Custom order not found"
            });
        }

        if (customOrder.status !== "SUBMITTED") {
            return res.status(400).json({
                message: "Only submitted custom orders can be accepted for review"
            });
        }

        const updatedOrder = await prisma.customOrder.update({
            where: {
                id: customOrderId as string
            },
            data: {
                status: "UNDER_REVIEW"
            }
        });

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "CUSTOM_ORDER",
                customOrderId: customOrderId as string,
                status: "UNDER_REVIEW",
                title: "Under Review",
                description: "A seller has accepted the request and is reviewing the requirements."
            }
        });

        return res.status(200).json({
            message: "Custom order accepted for review",
            customOrder: serializeCustomOrder(updatedOrder)
        });

    } catch (error) {
        console.error("ACCEPT CUSTOM ORDER ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const rejectCustomOrder = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const customOrderId = req.params.orderId || req.params.customOrderId;
        const { reason } = req.body;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!customOrderId) {
            return res.status(400).json({
                message: "Custom Order ID is required"
            });
        }

        if (!reason?.trim()) {
            return res.status(400).json({
                message: "Rejection reason is required"
            });
        }

        const customOrder = await prisma.customOrder.findUnique({
            where: {
                id: customOrderId as string
            }
        });

        if (!customOrder) {
            return res.status(404).json({
                message: "Custom order not found"
            });
        }

        const updatedOrder = await prisma.customOrder.update({
            where: {
                id: customOrderId as string
            },
            data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancellationReason: reason.trim()
            }
        });

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "CUSTOM_ORDER",
                customOrderId: customOrderId as string,
                status: "CANCELLED",
                title: "Request Cancelled",
                description: `Seller cancelled/rejected the request. Reason: ${reason.trim()}`
            }
        });

        return res.status(200).json({
            message: "Custom order request cancelled",
            customOrder: serializeCustomOrder(updatedOrder)
        });

    } catch (error) {
        console.error("REJECT CUSTOM ORDER ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const sendQuotation = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const customOrderId = req.params.orderId || req.params.customOrderId || req.body.customOrderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!customOrderId) {
            return res.status(400).json({
                message: "Custom Order ID is required"
            });
        }

        const { quotedPrice, estimatedDays, notes, validUntil } = req.body;

        if (quotedPrice === undefined || typeof quotedPrice !== "number" || quotedPrice <= 0) {
            return res.status(400).json({
                message: "Quoted price must be a positive number"
            });
        }

        if (estimatedDays === undefined || typeof estimatedDays !== "number" || estimatedDays <= 0 || !Number.isInteger(estimatedDays)) {
            return res.status(400).json({
                message: "Estimated days must be a positive integer"
            });
        }

        if (!validUntil) {
            return res.status(400).json({
                message: "Validity date is required"
            });
        }

        const validityDate = new Date(validUntil);
        if (isNaN(validityDate.getTime()) || validityDate <= new Date()) {
            return res.status(400).json({
                message: "Validity date must be a valid future date"
            });
        }

        const customOrder = await prisma.customOrder.findUnique({
            where: {
                id: customOrderId as string
            }
        });

        if (!customOrder) {
            return res.status(404).json({
                message: "Custom order not found"
            });
        }

        const existingQuote = await prisma.customOrderQuote.findUnique({
            where: {
                customOrderId_sellerId: {
                    customOrderId: customOrderId as string,
                    sellerId
                }
            }
        });

        if (existingQuote) {
            return res.status(400).json({
                message: "You have already submitted a quote for this order. Please update it instead."
            });
        }

        const quote = await prisma.customOrderQuote.create({
            data: {
                customOrderId: customOrderId as string,
                sellerId,
                quotedPrice,
                estimatedDays,
                notes: notes?.trim() || null,
                validUntil: validityDate
            }
        });

        await prisma.customOrder.update({
            where: {
                id: customOrderId as string
            },
            data: {
                status: "QUOTED"
            }
        });

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "CUSTOM_ORDER",
                customOrderId: customOrderId as string,
                status: "QUOTED",
                title: "Quotation Received",
                description: `Seller submitted a quote of $${quotedPrice} with an estimated turnaround time of ${estimatedDays} days.`
            }
        });

        return res.status(201).json({
            message: "Quotation sent successfully",
            quote
        });

    } catch (error) {
        console.error("SEND QUOTATION ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const updateQuotation = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const customOrderId = req.params.orderId || req.params.customOrderId || req.body.customOrderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!customOrderId) {
            return res.status(400).json({
                message: "Custom Order ID is required"
            });
        }

        const { quotedPrice, estimatedDays, notes, validUntil } = req.body;

        const existingQuote = await prisma.customOrderQuote.findUnique({
            where: {
                customOrderId_sellerId: {
                    customOrderId: customOrderId as string,
                    sellerId
                }
            }
        });

        if (!existingQuote) {
            return res.status(404).json({
                message: "Quotation not found for this custom order"
            });
        }

        const updateData: any = {};
        if (quotedPrice !== undefined) {
            if (typeof quotedPrice !== "number" || quotedPrice <= 0) {
                return res.status(400).json({
                    message: "Quoted price must be a positive number"
                });
            }
            updateData.quotedPrice = quotedPrice;
        }

        if (estimatedDays !== undefined) {
            if (typeof estimatedDays !== "number" || estimatedDays <= 0 || !Number.isInteger(estimatedDays)) {
                return res.status(400).json({
                    message: "Estimated days must be a positive integer"
                });
            }
            updateData.estimatedDays = estimatedDays;
        }

        if (validUntil !== undefined) {
            const validityDate = new Date(validUntil);
            if (isNaN(validityDate.getTime()) || validityDate <= new Date()) {
                return res.status(400).json({
                    message: "Validity date must be a valid future date"
                });
            }
            updateData.validUntil = validityDate;
        }

        if (notes !== undefined) {
            updateData.notes = notes?.trim() || null;
        }

        const updatedQuote = await prisma.customOrderQuote.update({
            where: {
                id: existingQuote.id
            },
            data: updateData
        });

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "CUSTOM_ORDER",
                customOrderId: customOrderId as string,
                status: "CUSTOM_ORDER_UPDATE",
                title: "Quotation Updated",
                description: `Seller updated their quote details.`
            }
        });

        return res.status(200).json({
            message: "Quotation updated successfully",
            quote: updatedQuote
        });

    } catch (error) {
        console.error("UPDATE QUOTATION ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const deleteQuotation = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const customOrderId = req.params.orderId || req.params.customOrderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!customOrderId) {
            return res.status(400).json({
                message: "Custom Order ID is required"
            });
        }

        const existingQuote = await prisma.customOrderQuote.findUnique({
            where: {
                customOrderId_sellerId: {
                    customOrderId: customOrderId as string,
                    sellerId
                }
            }
        });

        if (!existingQuote) {
            return res.status(404).json({
                message: "Quotation not found for this custom order"
            });
        }

        await prisma.customOrderQuote.delete({
            where: {
                id: existingQuote.id
            }
        });

        // Check if there are other quotes left. If not, we could revert status.
        const quotesCount = await prisma.customOrderQuote.count({
            where: {
                customOrderId: customOrderId as string
            }
        });

        if (quotesCount === 0) {
            await prisma.customOrder.update({
                where: {
                    id: customOrderId as string
                },
                data: {
                    status: "UNDER_REVIEW"
                }
            });
        }

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "CUSTOM_ORDER",
                customOrderId: customOrderId as string,
                status: "CUSTOM_ORDER_UPDATE",
                title: "Quotation Recalled",
                description: `Seller recalled/deleted their quote.`
            }
        });

        return res.status(200).json({
            message: "Quotation recalled successfully"
        });

    } catch (error) {
        console.error("DELETE QUOTATION ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const uploadCustomOrderFiles = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const customOrderId = req.params.orderId || req.params.customOrderId || req.body.customOrderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!customOrderId) {
            return res.status(400).json({
                message: "Custom Order ID is required"
            });
        }

        const { files } = req.body;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                message: "Files must be a non-empty array of file definitions"
            });
        }

        const customOrder = await prisma.customOrder.findUnique({
            where: {
                id: customOrderId as string
            }
        });

        if (!customOrder) {
            return res.status(404).json({
                message: "Custom order not found"
            });
        }

        // Validate resource ownership/authorization to prevent IDOR
        const hasQuoteOrReview = await prisma.customOrderQuote.findUnique({
            where: {
                customOrderId_sellerId: {
                    customOrderId: customOrderId as string,
                    sellerId
                }
            }
        });

        if (!hasQuoteOrReview && customOrder.status !== "UNDER_REVIEW" && customOrder.status !== "SUBMITTED") {
            return res.status(403).json({
                message: "Forbidden: You are not authorized to upload files to this custom order"
            });
        }

        const createdFiles = [];
        for (const file of files) {
            const { fileName, fileUrl, fileType, fileSizeBytes, mimeType } = file;
            if (!fileName?.trim() || !fileUrl?.trim() || !fileType) {
                return res.status(400).json({
                    message: "Each file must have a fileName, fileUrl, and fileType"
                });
            }

            const size = fileSizeBytes !== undefined ? BigInt(fileSizeBytes) : BigInt(0);

            const createdFile = await prisma.customOrderFile.create({
                data: {
                    customOrderId: customOrderId as string,
                    fileName: fileName.trim(),
                    fileUrl: fileUrl.trim(),
                    fileType,
                    fileSizeBytes: size,
                    mimeType: mimeType?.trim() || null
                }
            });

            createdFiles.push(createdFile);
        }

        const serializedFiles = createdFiles.map((file) => ({
            ...file,
            fileSizeBytes: Number(file.fileSizeBytes)
        }));

        return res.status(201).json({
            message: "Custom order files uploaded successfully",
            files: serializedFiles
        });

    } catch (error) {
        console.error("UPLOAD CUSTOM ORDER FILES ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};