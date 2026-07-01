import { prisma } from "../../../config/prisma.js";
import { AdminActionType } from "@prisma/client";

export const logAdminAction = async (params: {
    adminId: string;
    actionType: AdminActionType;
    targetType: string;
    targetId: string;
    description: string;
    previousValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
}) => {
    try {
        await prisma.adminAction.create({
            data: {
                adminId: params.adminId,
                actionType: params.actionType,
                targetType: params.targetType,
                targetId: params.targetId,
                description: params.description,
                previousValue: params.previousValue ? JSON.parse(JSON.stringify(params.previousValue)) : undefined,
                newValue: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : undefined,
                ipAddress: params.ipAddress || null,
                userAgent: params.userAgent || null
            }
        });
    } catch (error) {
        console.error("FAILED TO LOG ADMIN ACTION:", error);
    }
};
