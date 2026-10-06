import { prisma } from "../../../config/prisma.js";
import {
    ALL_PERMISSIONS,
    FALLBACK_ROLE,
    SYSTEM_ROLES,
    UNRESTRICTED_ROLES,
    isValidPermissionKey
} from "./permissionCatalog.js";

export interface PermissionSubject {
    id: string;
    role?: string | null;
    roleId?: string | null;
    isSuperAdmin?: boolean;
}

const CACHE_TTL_MS = 30_000;
const permissionCache = new Map<string, { permissions: string[]; expiresAt: number }>();

export const invalidatePermissionCache = (adminId?: string): void => {
    if (adminId) permissionCache.delete(adminId);
    else permissionCache.clear();
};

/** Seeds the nine system roles when the table is empty (fresh `db push`). */
export const ensureDefaultRoles = async (): Promise<void> => {
    try {
        const count = await prisma.adminRole.count();
        if (count > 0) return;
        for (const role of SYSTEM_ROLES) {
            await prisma.adminRole.upsert({
                where: { name: role.name },
                update: {},
                create: {
                    name: role.name,
                    displayName: role.displayName,
                    description: role.description,
                    isSystem: true,
                    permissions: role.permissions
                }
            });
        }
        console.log("[RBAC] Seeded default admin roles");
    } catch (error) {
        console.error("[RBAC] Failed to seed default admin roles:", error);
    }
};

const findRole = async (subject: PermissionSubject) => {
    if (subject.roleId) {
        const byId = await prisma.adminRole.findUnique({ where: { id: subject.roleId } });
        if (byId) return byId;
    }
    const legacyName = (subject.role || "").trim().toUpperCase();
    if (legacyName) {
        const byName = await prisma.adminRole.findUnique({ where: { name: legacyName } });
        if (byName) return byName;
    }
    return null;
};

const resolvePermissions = async (subject: PermissionSubject): Promise<string[]> => {
    if (subject.isSuperAdmin) return [...ALL_PERMISSIONS];

    const role = await findRole(subject);

    if (!role) {
        const fallback = await prisma.adminRole.findUnique({ where: { name: FALLBACK_ROLE } });
        if (fallback && fallback.permissions.length > 0) return fallback.permissions;
        // Roles table unavailable/broken: never lock an existing admin out.
        return [...ALL_PERMISSIONS];
    }

    if (UNRESTRICTED_ROLES.has(role.name)) return [...ALL_PERMISSIONS];
    if (role.permissions.length === 0) return [...ALL_PERMISSIONS];

    return role.permissions;
};

const loadSubject = async (adminId: string): Promise<PermissionSubject | null> => {
    const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: { id: true, role: true, roleId: true, isSuperAdmin: true, isActive: true }
    });
    if (!admin || !admin.isActive) return null;
    return admin;
};

export const getAdminPermissions = async (
    subject: PermissionSubject | string
): Promise<string[]> => {
    const resolved: PermissionSubject | null =
        typeof subject === "string" ? await loadSubject(subject) : subject;
    if (!resolved) return [];

    const cached = permissionCache.get(resolved.id);
    if (cached && cached.expiresAt > Date.now()) return cached.permissions;

    const permissions = await resolvePermissions(resolved);
    permissionCache.set(resolved.id, {
        permissions,
        expiresAt: Date.now() + CACHE_TTL_MS
    });
    return permissions;
};

/** `customers.view` matches `customers.view`, `customers.*` or `*`. */
export const matchesPermission = (granted: string[], required: string): boolean => {
    if (granted.includes("*")) return true;
    if (granted.includes(required)) return true;
    const group = required.split(".")[0];
    return granted.includes(`${group}.*`);
};

export const hasPermission = async (
    subject: PermissionSubject | string,
    required: string | string[]
): Promise<boolean> => {
    const granted = await getAdminPermissions(subject);
    const keys = Array.isArray(required) ? required : [required];
    return keys.some((key) => matchesPermission(granted, key));
};

/** Filter an arbitrary list of keys down to the ones the admin actually holds. */
export const filterPermissions = async (
    subject: PermissionSubject | string,
    requested: string[]
): Promise<string[]> => {
    const granted = await getAdminPermissions(subject);
    return requested.filter((key) => matchesPermission(granted, key));
};

export const sanitizePermissions = (permissions: unknown): string[] => {
    if (!Array.isArray(permissions)) return [];
    return Array.from(
        new Set(
            permissions
                .filter((key): key is string => typeof key === "string")
                .filter((key) => isValidPermissionKey(key))
        )
    );
};
