import type { Request, Response } from "express";
import { AdminActionType } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import {
    getAdminPermissions,
    invalidatePermissionCache,
    sanitizePermissions
} from "../services/permissionService.js";
import { ALL_PERMISSIONS, PERMISSION_CATALOG } from "../services/permissionCatalog.js";

export const getMe = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;

        const [permissions, admin] = await Promise.all([
            getAdminPermissions(adminId),
            prisma.admin.findUnique({
                where: { id: adminId },
                select: {
                    role: true,
                    roleId: true,
                    isSuperAdmin: true,
                    adminRole: { select: { name: true } }
                }
            })
        ]);

        if (!admin) return res.status(401).json({ message: "Unauthorized" });

        return res.status(200).json({
            permissions,
            roleName: admin.adminRole?.name ?? admin.role ?? null,
            roleId: admin.roleId ?? null,
            isSuperAdmin: admin.isSuperAdmin
        });
    } catch (error: any) {
        console.error("GET ME ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getPermissionCatalog = async (_req: Request, res: Response) => {
    try {
        return res.status(200).json({ groups: PERMISSION_CATALOG, permissions: ALL_PERMISSIONS });
    } catch (error: any) {
        console.error("GET PERMISSIONS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const listRoles = async (_req: Request, res: Response) => {
    try {
        const roles = await prisma.adminRole.findMany({
            orderBy: { name: "asc" },
            include: { _count: { select: { admins: true } } }
        });

        const items = roles.map(({ _count, ...role }) => ({
            ...role,
            adminCount: _count.admins
        }));

        return res.status(200).json({ roles: items });
    } catch (error: any) {
        console.error("GET ROLES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const createRole = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { name, displayName, description, permissions } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "name is required" });
        }
        if (typeof displayName !== "string" || !displayName.trim()) {
            return res.status(400).json({ message: "displayName is required" });
        }

        const finalName = name.trim().toUpperCase();

        const duplicate = await prisma.adminRole.findFirst({
            where: { name: { equals: finalName, mode: "insensitive" } }
        });
        if (duplicate) return res.status(409).json({ message: "Role name already exists" });

        const role = await prisma.adminRole.create({
            data: {
                name: finalName,
                displayName: displayName.trim(),
                description: typeof description === "string" ? description : null,
                permissions: sanitizePermissions(permissions)
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.ROLE_CREATED,
            targetType: "AdminRole",
            targetId: role.id,
            description: `Role '${role.name}' created`,
            previousValue: null,
            newValue: { name: role.name, displayName: role.displayName, permissions: role.permissions },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({ role });
    } catch (error: any) {
        console.error("CREATE ROLE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateRole = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const roleId = String(req.params.id);

        const existing = await prisma.adminRole.findUnique({ where: { id: roleId } });
        if (!existing) return res.status(404).json({ message: "Role not found." });

        const { name, displayName, description, permissions } = req.body;

        if (name !== undefined && existing.isSystem) {
            return res.status(409).json({ message: "System roles cannot be renamed." });
        }

        const data: {
            name?: string;
            displayName?: string;
            description?: string | null;
            permissions?: string[];
        } = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({ message: "name must be a non-empty string" });
            }
            const finalName = name.trim().toUpperCase();
            const duplicate = await prisma.adminRole.findFirst({
                where: { name: { equals: finalName, mode: "insensitive" }, NOT: { id: roleId } }
            });
            if (duplicate) return res.status(409).json({ message: "Role name already exists" });
            data.name = finalName;
        }

        if (displayName !== undefined) {
            if (typeof displayName !== "string" || !displayName.trim()) {
                return res.status(400).json({ message: "displayName must be a non-empty string" });
            }
            data.displayName = displayName.trim();
        }

        if (description !== undefined) {
            data.description = typeof description === "string" ? description : null;
        }

        if (permissions !== undefined) {
            data.permissions = sanitizePermissions(permissions);
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ message: "No updatable fields provided" });
        }

        const role = await prisma.adminRole.update({ where: { id: roleId }, data });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.ROLE_UPDATED,
            targetType: "AdminRole",
            targetId: role.id,
            description: `Role '${role.name}' updated`,
            previousValue: {
                name: existing.name,
                displayName: existing.displayName,
                description: existing.description,
                permissions: existing.permissions
            },
            newValue: {
                name: role.name,
                displayName: role.displayName,
                description: role.description,
                permissions: role.permissions
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        invalidatePermissionCache();

        return res.status(200).json({ role });
    } catch (error: any) {
        console.error("UPDATE ROLE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteRole = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const roleId = String(req.params.id);

        const existing = await prisma.adminRole.findUnique({
            where: { id: roleId },
            include: { _count: { select: { admins: true } } }
        });
        if (!existing) return res.status(404).json({ message: "Role not found." });

        if (existing.isSystem) {
            return res.status(409).json({ message: "System roles cannot be deleted." });
        }

        const adminCount = existing._count.admins;
        if (adminCount > 0) {
            return res
                .status(409)
                .json({ message: `Role is assigned to ${adminCount} admin(s). Reassign them first.` });
        }

        await prisma.adminRole.delete({ where: { id: roleId } });
        invalidatePermissionCache();

        await logAdminAction({
            adminId,
            actionType: AdminActionType.ROLE_DELETED,
            targetType: "AdminRole",
            targetId: roleId,
            description: `Role '${existing.name}' deleted`,
            previousValue: {
                name: existing.name,
                displayName: existing.displayName,
                permissions: existing.permissions
            },
            newValue: null,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ message: "Role deleted" });
    } catch (error: any) {
        console.error("DELETE ROLE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
