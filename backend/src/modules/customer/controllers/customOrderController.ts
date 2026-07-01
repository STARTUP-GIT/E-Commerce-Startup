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

export const createCustomOrder = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const { title, description, material, quantity = 1, specifications, files, shippingAddressId } = req.body;

        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({
                message: "Title and description are required"
            });
        }

        if (quantity <= 0 || !Number.isInteger(quantity)) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        const orderNumber = `CUST-ORD-${Date.now()}`;

        const customOrder = await prisma.customOrder.create({
            data: {
                orderNumber,
                customerId,
                shippingAddressId: shippingAddressId || null,
                title: title.trim(),
                description: description.trim(),
                material: material?.trim() || null,
                quantity,
                status: "SUBMITTED",
                submittedAt: new Date(),
                specifications: specifications || null,
                files: files && Array.isArray(files) && files.length > 0 ? {
                    create: files.map((f: any) => ({
                        fileName: f.fileName,
                        fileUrl: f.fileUrl,
                        fileType: f.fileType,
                        fileSizeBytes: BigInt(f.fileSizeBytes || 0),
                        mimeType: f.mimeType || null
                    }))
                } : undefined
            },
            include: {
                files: true
            }
        });

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "CUSTOM_ORDER",
                customOrderId: customOrder.id,
                status: "SUBMITTED",
                title: "Request Submitted",
                description: "Customer submitted custom manufacturing request."
            }
        });

        return res.status(201).json({
            message: "Custom order created successfully",
            customOrder: serializeCustomOrder(customOrder)
        });

    } catch (error) {
        console.error("CREATE CUSTOM ORDER ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getCustomOrders = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const customOrders = await prisma.customOrder.findMany({
            where: {
                customerId
            },
            include: {
                files: true,
                quotes: {
                    include: {
                        seller: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                shop: true
                            }
                        }
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

export const getCustomOrder = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const customOrderId = req.params.id;

        if (!customerId) {
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
                    include: {
                        seller: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                shop: true
                            }
                        }
                    }
                },
                timelineEvents: {
                    orderBy: {
                        occurredAt: "asc"
                    }
                }
            }
        });

        if (!customOrder || customOrder.customerId !== customerId) {
            return res.status(404).json({
                message: "Custom order not found"
            });
        }

        return res.status(200).json({
            customOrder: serializeCustomOrder(customOrder)
        });

    } catch (error) {
        console.error("GET CUSTOM ORDER ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const cancelCustomOrder = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const customOrderId = req.params.id;
        const { reason } = req.body;

        if (!customerId) {
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

        if (!customOrder || customOrder.customerId !== customerId) {
            return res.status(404).json({
                message: "Custom order not found"
            });
        }

        const uncancelableStatuses = ["IN_PRODUCTION", "QUALITY_CHECK", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "COMPLETED"];
        if (uncancelableStatuses.includes(customOrder.status)) {
            return res.status(400).json({
                message: `Cannot cancel order in status ${customOrder.status}`
            });
        }

        const updatedOrder = await prisma.customOrder.update({
            where: {
                id: customOrderId as string
            },
            data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancellationReason: reason?.trim() || "Cancelled by customer"
            }
        });

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "CUSTOM_ORDER",
                customOrderId: customOrderId as string,
                status: "CANCELLED",
                title: "Request Cancelled",
                description: `Customer cancelled the custom order request. Reason: ${reason?.trim() || "No reason provided"}`
            }
        });

        return res.status(200).json({
            message: "Custom order request cancelled successfully",
            customOrder: serializeCustomOrder(updatedOrder)
        });

    } catch (error) {
        console.error("CANCEL CUSTOM ORDER ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const acceptQuotation = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const customOrderId = req.params.id;
        const { quoteId } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!customOrderId || !quoteId) {
            return res.status(400).json({
                message: "Custom Order ID and Quote ID are required"
            });
        }

        const customOrder = await prisma.customOrder.findUnique({
            where: { id: customOrderId as string }
        });

        if (!customOrder || customOrder.customerId !== customerId) {
            return res.status(404).json({
                message: "Custom order not found"
            });
        }

        const quote = await prisma.customOrderQuote.findUnique({
            where: { id: quoteId }
        });

        if (!quote || quote.customOrderId !== customOrderId) {
            return res.status(404).json({
                message: "Quotation not found for this custom order"
            });
        }

        const now = new Date();
        if (quote.validUntil < now) {
            return res.status(400).json({
                message: "Quotation validity has expired"
            });
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Update the accepted quote
            await tx.customOrderQuote.update({
                where: { id: quoteId },
                data: {
                    isAccepted: true,
                    acceptedAt: new Date()
                }
            });

            // Update other quotes to reject them
            await tx.customOrderQuote.updateMany({
                where: {
                    customOrderId: customOrderId as string,
                    id: { not: quoteId }
                },
                data: {
                    rejectedAt: new Date(),
                    rejectionReason: "Another quote was accepted by the customer"
                }
            });

            // Accept quote on custom order
            const result = await tx.customOrder.update({
                where: { id: customOrderId as string },
                data: {
                    status: "QUOTE_ACCEPTED",
                    acceptedQuoteId: quoteId
                }
            });

            await tx.orderTimelineEvent.create({
                data: {
                    entityType: "CUSTOM_ORDER",
                    customOrderId: customOrderId as string,
                    status: "QUOTE_ACCEPTED",
                    title: "Quotation Accepted",
                    description: `Quotation from seller accepted. turnaround: ${quote.estimatedDays} days. Price: $${quote.quotedPrice}`
                }
            });

            return result;
        });

        return res.status(200).json({
            message: "Quotation accepted successfully",
            customOrder: serializeCustomOrder(updatedOrder)
        });

    } catch (error) {
        console.error("ACCEPT QUOTATION ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const rejectQuotation = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const customOrderId = req.params.id;
        const { quoteId, reason } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!customOrderId || !quoteId) {
            return res.status(400).json({
                message: "Custom Order ID and Quote ID are required"
            });
        }

        const customOrder = await prisma.customOrder.findUnique({
            where: { id: customOrderId as string }
        });

        if (!customOrder || customOrder.customerId !== customerId) {
            return res.status(404).json({
                message: "Custom order not found"
            });
        }

        const quote = await prisma.customOrderQuote.findUnique({
            where: { id: quoteId }
        });

        if (!quote || quote.customOrderId !== customOrderId) {
            return res.status(404).json({
                message: "Quotation not found for this custom order"
            });
        }

        const updatedQuote = await prisma.customOrderQuote.update({
            where: { id: quoteId },
            data: {
                rejectedAt: new Date(),
                rejectionReason: reason?.trim() || "Rejected by customer"
            }
        });

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "CUSTOM_ORDER",
                customOrderId: customOrderId as string,
                status: "QUOTE_REJECTED",
                title: "Quotation Rejected",
                description: `Turnaround: ${quote.estimatedDays} days. Price: $${quote.quotedPrice}. Reason: ${reason?.trim() || "No reason provided"}`
            }
        });

        // Revert order status back to QUOTING if it was accepted
        if (customOrder.acceptedQuoteId === quoteId) {
            const revertedOrder = await prisma.customOrder.update({
                where: { id: customOrderId as string },
                data: {
                    status: "QUOTING",
                    acceptedQuoteId: null
                }
            });

            return res.status(200).json({
                message: "Quotation rejected and custom order status reverted",
                customOrder: serializeCustomOrder(revertedOrder)
            });
        }

        return res.status(200).json({
            message: "Quotation rejected successfully",
            quote: updatedQuote
        });

    } catch (error) {
        console.error("REJECT QUOTATION ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const uploadAdditionalFiles = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const customOrderId = req.params.id;
        const { files } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!customOrderId) {
            return res.status(400).json({
                message: "Custom Order ID is required"
            });
        }

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                message: "Files must be a non-empty array of file definitions"
            });
        }

        const customOrder = await prisma.customOrder.findUnique({
            where: { id: customOrderId as string }
        });

        if (!customOrder || customOrder.customerId !== customerId) {
            return res.status(404).json({
                message: "Custom order not found"
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

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "CUSTOM_ORDER",
                customOrderId: customOrderId as string,
                status: "CUSTOM_ORDER_UPDATE",
                title: "Files Uploaded",
                description: `Customer uploaded ${serializedFiles.length} additional reference files.`
            }
        });

        return res.status(201).json({
            message: "Additional files uploaded successfully",
            files: serializedFiles
        });

    } catch (error) {
        console.error("UPLOAD ADDITIONAL FILES ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};
