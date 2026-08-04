// =============================================================================
// PLATFORM AUTH CONTROLLER
// =============================================================================

import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../../config/token.js";
import { setAuthCookie, clearAuthCookie, setRefreshCookie, clearRefreshCookie } from "../../../config/sessionCookies.js";
import { getOwnerRole, seedPlatformRolesAndPermissions } from "../utils/platformRoles.js";
import { auditRequest } from "../utils/auditLogger.js";
import type { PlatformUserStatus, PlatformRoleType } from "@prisma/client";

const safeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  avatarUrl: user.avatarUrl,
  phone: user.phone,
  status: user.status,
  isOwner: user.isOwner,
  roleId: user.roleId,
  role: user.role ? { id: user.role.id, name: user.role.name, type: user.role.type } : null,
  permissions: user.role?.permissions?.map((p: any) => p.key) || [],
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// ─── Setup Status ────────────────────────────────────────────────────────────

export const getSetupStatus = async (_req: Request, res: Response) => {
  try {
    const count = await prisma.platformUser.count();
    return res.status(200).json({ initialized: count > 0 });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── First User Setup ────────────────────────────────────────────────────────
// Creates the Platform Owner. The same credentials ALSO create a Marketplace
// Super Admin so the Platform Owner can access BOTH panels with one account.
// Marketplace Admins never gain Platform access automatically.

export const setupFirstUser = async (req: Request, res: Response) => {
  try {
    const count = await prisma.platformUser.count();
    if (count > 0) {
      return res.status(403).json({ message: "Platform is already initialized." });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const nameParts = (name as string).trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    await seedPlatformRolesAndPermissions();
    const ownerRole = await getOwnerRole();
    const passwordHash = await hashPassword(password);

    const user = await prisma.platformUser.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        isOwner: true,
        status: "ACTIVE",
        roleId: ownerRole?.id || null,
      },
      include: { role: { include: { permissions: true } } },
    });

    // Dual access: mirror the owner as a Marketplace Super Admin (same email/password).
    const existingAdmin = await prisma.admin.findUnique({ where: { email: user.email } });
    if (!existingAdmin) {
      await prisma.admin.create({
        data: {
          email: user.email,
          passwordHash,
          firstName,
          lastName,
          isSuperAdmin: true,
          role: "SUPER_ADMIN",
          isActive: true,
          authProvider: "EMAIL",
        },
      });
    }

    await auditRequest(req, {
      userId: user.id,
      email: user.email,
      action: "PLATFORM_INITIALIZED",
      module: "auth",
      targetType: "PlatformUser",
      targetId: user.id,
      description: "Platform initialized and owner account created",
    });

    const accessToken = signAccessToken(user.id);
    setAuthCookie(res, "platform_session", accessToken);

    return res.status(201).json({
      message: "Platform Owner created successfully. You can now access the Marketplace Admin with the same credentials.",
      user: safeUser(user),
    });
  } catch (error: any) {
    console.error("PLATFORM SETUP ERROR:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.platformUser.findUnique({
      where: { email: (email as string).trim().toLowerCase() },
      include: { role: { include: { permissions: true } } },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "Platform user account is disabled" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = signAccessToken(user.id);
    setAuthCookie(res, "platform_session", accessToken);

    const refreshToken = signRefreshToken(user.id);
    const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await prisma.refreshToken.create({
      data: { userId: user.id, userType: "PLATFORM", tokenHash: refreshHash, expiresAt },
    });
    setRefreshCookie(res, refreshToken);

    await prisma.platformUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await auditRequest(req, {
      userId: user.id,
      email: user.email,
      action: "LOGIN",
      module: "auth",
      targetType: "PlatformUser",
      targetId: user.id,
      description: "Platform user logged in",
    });

    return res.status(200).json({ message: "Login successful", user: safeUser(user) });
  } catch (error: any) {
    console.error("PLATFORM LOGIN ERROR:", error);
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Logout ──────────────────────────────────────────────────────────────────

export const logout = async (req: Request, res: Response) => {
  try {
    clearAuthCookie(res, "platform_session");
    clearRefreshCookie(res);
    if (req.platformUserId) {
      await prisma.refreshToken.updateMany({
        where: { userId: req.platformUserId, userType: "PLATFORM", revoked: false },
        data: { revoked: true },
      });
      await auditRequest(req, {
        userId: req.platformUserId,
        email: req.platformUser?.email,
        action: "LOGOUT",
        module: "auth",
        targetType: "PlatformUser",
        targetId: req.platformUserId,
        description: "Platform user logged out",
      });
    }
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Refresh ─────────────────────────────────────────────────────────────────

export const refresh = async (req: Request, res: Response) => {
  try {
    const rawToken = req.cookies?.platform_refresh || req.headers["x-refresh-token"];
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    let payload: any;
    try {
      payload = verifyRefreshToken(token) as any;
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const userId = payload.id as string;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const stored = await prisma.refreshToken.findFirst({
      where: { tokenHash, userId, userType: "PLATFORM", revoked: false, expiresAt: { gt: new Date() } },
    });
    if (!stored) return res.status(401).json({ message: "Refresh token invalid or revoked" });

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const newRefresh = signRefreshToken(userId);
    const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");
    await prisma.refreshToken.create({
      data: { userId, userType: "PLATFORM", tokenHash: newHash, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) },
    });

    const accessToken = signAccessToken(userId);
    setAuthCookie(res, "platform_session", accessToken);
    setRefreshCookie(res, newRefresh);

    return res.status(200).json({ message: "Refreshed" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Profile ─────────────────────────────────────────────────────────────────

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.platformUserId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await prisma.platformUser.findUnique({
      where: { id: userId },
      include: { role: { include: { permissions: true } } },
    });
    if (!user) return res.status(404).json({ message: "Platform user not found" });

    return res.status(200).json({ user: safeUser(user) });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.platformUserId!;
    const { firstName, lastName, phone, avatarUrl } = req.body;

    const updated = await prisma.platformUser.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
      include: { role: { include: { permissions: true } } },
    });

    await auditRequest(req, {
      userId,
      email: updated.email,
      action: "PROFILE_UPDATED",
      module: "auth",
      targetType: "PlatformUser",
      targetId: userId,
      description: "Platform user updated profile",
    });

    return res.status(200).json({ message: "Profile updated successfully", user: safeUser(updated) });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.platformUserId!;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await prisma.platformUser.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "Platform user not found" });

    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) return res.status(400).json({ message: "Incorrect current password" });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.platformUser.update({ where: { id: userId }, data: { passwordHash } });

    await auditRequest(req, {
      userId,
      email: user.email,
      action: "PASSWORD_CHANGED",
      module: "auth",
      targetType: "PlatformUser",
      targetId: userId,
      description: "Platform user changed password",
    });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── User Management (USERS_MANAGE) ──────────────────────────────────────────

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.platformUser.findMany({
      orderBy: { createdAt: "desc" },
      include: { role: { include: { permissions: true } } },
    });
    return res.status(200).json({ users: users.map(safeUser) });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, roleId } = req.body;
    if (!firstName || !email || !roleId) {
      return res.status(400).json({ message: "firstName, email, and roleId are required" });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existing = await prisma.platformUser.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Platform user with this email already exists" });
    }

    const passwordHash = password ? await hashPassword(password) : null;
    const user = await prisma.platformUser.create({
      data: {
        email: email.trim().toLowerCase(),
        firstName,
        lastName: lastName || "",
        passwordHash,
        roleId,
        isOwner: false,
        status: "ACTIVE",
      },
      include: { role: { include: { permissions: true } } },
    });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "USER_CREATED",
      module: "users",
      targetType: "PlatformUser",
      targetId: user.id,
      description: `Created platform user ${user.email}`,
      newValue: { email: user.email, roleId: user.roleId },
    });

    return res.status(201).json({ message: "Platform user created successfully", user: safeUser(user) });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body as { status: PlatformUserStatus };
    if (!status) return res.status(400).json({ message: "status is required" });

    const target = await prisma.platformUser.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ message: "Platform user not found" });

    if (target.isOwner && status !== "ACTIVE") {
      const activeOwners = await prisma.platformUser.count({ where: { isOwner: true, status: "ACTIVE" } });
      if (activeOwners <= 1) {
        return res.status(400).json({ message: "At least one active Platform Owner must remain" });
      }
    }

    const updated = await prisma.platformUser.update({
      where: { id },
      data: { status },
      include: { role: { include: { permissions: true } } },
    });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "USER_STATUS_UPDATED",
      module: "users",
      targetType: "PlatformUser",
      targetId: id,
      description: `Changed platform user ${target.email} status to ${status}`,
      previousValue: { status: target.status },
      newValue: { status },
    });

    return res.status(200).json({ message: "Platform user status updated", user: safeUser(updated) });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { roleId } = req.body;
    if (!roleId) return res.status(400).json({ message: "roleId is required" });

    const target = await prisma.platformUser.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ message: "Platform user not found" });

    if (target.isOwner) {
      const role = await prisma.platformRole.findUnique({ where: { id: roleId } });
      if (role && role.type !== "OWNER") {
        return res.status(400).json({ message: "The Platform Owner cannot be assigned a non-owner role" });
      }
    }

    const updated = await prisma.platformUser.update({
      where: { id },
      data: { roleId },
      include: { role: { include: { permissions: true } } },
    });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "USER_ROLE_UPDATED",
      module: "users",
      targetType: "PlatformUser",
      targetId: id,
      description: `Updated role for ${target.email}`,
      previousValue: { roleId: target.roleId },
      newValue: { roleId },
    });

    return res.status(200).json({ message: "Platform user role updated", user: safeUser(updated) });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const target = await prisma.platformUser.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ message: "Platform user not found" });

    const passwordHash = await hashPassword(password);
    await prisma.platformUser.update({ where: { id }, data: { passwordHash } });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "USER_PASSWORD_RESET",
      module: "users",
      targetType: "PlatformUser",
      targetId: id,
      description: `Reset password for ${target.email}`,
    });

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Roles (ROLES_MANAGE) ────────────────────────────────────────────────────

export const listRoles = async (_req: Request, res: Response) => {
  try {
    const roles = await prisma.platformRole.findMany({
      orderBy: { isSystem: "desc" },
      include: {
        permissions: { orderBy: { module: "asc" } },
        _count: { select: { users: true } },
      },
    });
    return res.status(200).json({ roles });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, description, type, permissionIds } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const existing = await prisma.platformRole.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ message: "Role with this name already exists" });

    const role = await prisma.platformRole.create({
      data: {
        name,
        description,
        type: (type as PlatformRoleType) || "CUSTOM",
        isSystem: false,
        permissions: permissionIds?.length ? { connect: permissionIds.map((id: string) => ({ id })) } : undefined,
      },
      include: { permissions: true },
    });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "ROLE_CREATED",
      module: "rbac",
      targetType: "PlatformRole",
      targetId: role.id,
      description: `Created platform role ${name}`,
      newValue: { name, description, type },
    });

    return res.status(201).json({ message: "Role created successfully", role });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description, permissionIds } = req.body;

    const existing = await prisma.platformRole.findUnique({ where: { id }, include: { permissions: true } });
    if (!existing) return res.status(404).json({ message: "Role not found" });

    const data: any = {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    };
    if (permissionIds) {
      data.permissions = { set: permissionIds.map((pid: string) => ({ id: pid })) };
    }

    const role = await prisma.platformRole.update({ where: { id }, data, include: { permissions: true } });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "ROLE_UPDATED",
      module: "rbac",
      targetType: "PlatformRole",
      targetId: id,
      description: `Updated platform role ${existing.name}`,
      previousValue: { name: existing.name, permissionIds: existing.permissions.map((p) => p.id) },
      newValue: { name: role.name, permissionIds: role.permissions.map((p) => p.id) },
    });

    return res.status(200).json({ message: "Role updated successfully", role });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.platformRole.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Role not found" });
    if (existing.isSystem) {
      return res.status(400).json({ message: "System roles cannot be deleted" });
    }

    const usersCount = await prisma.platformUser.count({ where: { roleId: id } });
    if (usersCount > 0) {
      return res.status(400).json({ message: "Cannot delete a role that has assigned users" });
    }

    await prisma.platformRole.delete({ where: { id } });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "ROLE_DELETED",
      module: "rbac",
      targetType: "PlatformRole",
      targetId: id,
      description: `Deleted platform role ${existing.name}`,
    });

    return res.status(200).json({ message: "Role deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Permissions (PERMISSIONS_MANAGE) ────────────────────────────────────────

export const listPermissions = async (_req: Request, res: Response) => {
  try {
    const permissions = await prisma.platformPermission.findMany({ orderBy: { module: "asc" } });
    return res.status(200).json({ permissions });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const createPermission = async (req: Request, res: Response) => {
  try {
    const { key, name, description, module } = req.body;
    if (!key || !name || !module) {
      return res.status(400).json({ message: "key, name, and module are required" });
    }
    const existing = await prisma.platformPermission.findUnique({ where: { key } });
    if (existing) return res.status(409).json({ message: "Permission already exists" });

    const permission = await prisma.platformPermission.create({ data: { key, name, description, module } });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "PERMISSION_CREATED",
      module: "rbac",
      targetType: "PlatformPermission",
      targetId: permission.id,
      description: `Created permission ${key}`,
    });

    return res.status(201).json({ message: "Permission created successfully", permission });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const deletePermission = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.platformPermission.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Permission not found" });

    await prisma.platformPermission.delete({ where: { id } });

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "PERMISSION_DELETED",
      module: "rbac",
      targetType: "PlatformPermission",
      targetId: id,
      description: `Deleted permission ${existing.key}`,
    });

    return res.status(200).json({ message: "Permission deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
