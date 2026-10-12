import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getSidebarBadges = async (req: Request, res: Response) => {
    try {
        const adminId = (req as any).adminId;

        // Customer & Seller Conversations unread counts using established readReceipts model
        const conversations = await prisma.conversation.findMany({
            where: {
                status: { in: ["OPEN", "PENDING"] }
            },
            select: {
                id: true,
                type: true,
                readReceipts: {
                    where: { readerType: "ADMIN", readerId: adminId || "" },
                    select: { lastReadAt: true }
                },
                messages: {
                    where: { senderType: { not: "ADMIN" }, isInternal: false },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { createdAt: true }
                }
            }
        });

        let customerUnread = 0;
        let sellerUnread = 0;
        for (const c of conversations) {
            const lastIncoming = c.messages[0];
            if (!lastIncoming) continue;
            const lastReadAt = c.readReceipts[0]?.lastReadAt || new Date(0);
            if (new Date(lastIncoming.createdAt) > new Date(lastReadAt)) {
                if (c.type === "CUSTOMER_ADMIN") customerUnread++;
                else if (c.type === "SELLER_ADMIN") sellerUnread++;
            }
        }

        const [
            shopsPending,
            sellerVerificationsPending,
            sellerAgreementsActionable,
            appealsPending,
            customerReportsPending,
            productReportsPending,
            supportTicketsOpen,
            ordersPending,
            returnsPending,
            packingFeeRequestsPending,
            sellerPayoutsPending
        ] = await Promise.all([
            // Shops awaiting action: shops in PENDING status or with active approval request awaiting review or final approval
            prisma.shop.count({
                where: {
                    OR: [
                        { status: "PENDING" },
                        {
                            approvalRequests: {
                                some: {
                                    status: { in: ["PENDING_REVIEW", "AGREEMENT_ACCEPTED", "AWAITING_FINAL_APPROVAL"] }
                                }
                            }
                        }
                    ]
                }
            }),
            // Seller Verifications: pending reviews
            prisma.sellerVerification.count({
                where: { status: "PENDING" }
            }),
            // Seller Agreements: agreements awaiting admin action (accepted awaiting final review, or declined)
            prisma.shopAgreement.count({
                where: { status: { in: ["ACCEPTED", "DECLINED"] } }
            }),
            // Appeals: awaiting review
            prisma.sellerAppeal.count({
                where: { status: { in: ["PENDING", "UNDER_REVIEW"] } }
            }),
            // Customer Reports: awaiting investigation
            prisma.customerCaseReport.count({
                where: { status: { in: ["PENDING", "UNDER_REVIEW", "INVESTIGATING"] } }
            }),
            // Product Reports: awaiting action
            prisma.productReport.count({
                where: { status: { in: ["PENDING", "UNDER_REVIEW"] } }
            }),
            // Support Tickets: open / in progress
            prisma.supportTicket.count({
                where: { status: { in: ["OPEN", "IN_PROGRESS"] } }
            }),
            // Orders: pending seller orders
            prisma.sellerOrder.count({
                where: { status: "PENDING" }
            }),
            // Returns: pending return requests
            prisma.returnRequest.count({
                where: { status: { in: ["REQUESTED", "PENDING_REVIEW"] } }
            }),
            // Packing Fee Requests: pending requests
            prisma.packingFeeRequest.count({
                where: { status: "PENDING" }
            }),
            // Seller Payouts: pending payout processing
            prisma.sellerPayout.count({
                where: { status: "PENDING" }
            })
        ]);

        return res.status(200).json({
            customerConversations: customerUnread,
            sellerConversations: sellerUnread,
            shops: shopsPending,
            sellerVerifications: sellerVerificationsPending,
            sellerAgreements: sellerAgreementsActionable,
            appeals: appealsPending,
            customerReports: customerReportsPending,
            productReports: productReportsPending,
            supportTickets: supportTicketsOpen,
            orders: ordersPending,
            returns: returnsPending,
            packingFeeRequests: packingFeeRequestsPending,
            sellerPayouts: sellerPayoutsPending,
        });
    } catch (error: any) {
        console.error("GET SIDEBAR BADGES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
