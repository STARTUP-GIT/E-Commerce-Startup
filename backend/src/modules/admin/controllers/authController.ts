import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../../config/token.js";
import { setAuthCookie, clearAuthCookie, setRefreshCookie, clearRefreshCookie } from "../../../config/sessionCookies.js";
import { extractCandidateTokens } from "../../../middleware/tokenExtractor.js";
import { OAuth2Client } from "google-auth-library";
import EmailService from "../../../services/email/EmailService.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType, AdminAccountStatus, AdminInvitationStatus, AccessRequestStatus, EmailChangeStatus } from "@prisma/client";
import storageService from "../../storage/services/storage.service.js";
import {
    hasPermission,
    getAdminPermissions,
    invalidatePermissionCache
} from "../services/permissionService.js";
import { disconnectActorSockets } from "../../../services/chat/chat.service.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getSafeErrorMessage = (error: unknown): string => {
    const fallback = "Something went wrong. Please try again later.";

    if (error instanceof Error && error.message) {
        const normalized = error.message.replace(/\s+/g, " ").trim();
        if (!normalized) return fallback;

        const exposesPrismaError = /Invalid `prisma\.|PrismaClientKnownRequestError|P2002|P2025|P1001|PostgreSQL|column .* does not exist|database error|stack trace/i.test(normalized);
        if (exposesPrismaError) {
            return fallback;
        }

        return normalized;
    }

    return fallback;
};

const resolveAdminRoleId = async (roleName: string): Promise<string | null> => {
    const role = await prisma.adminRole.findUnique({ where: { name: roleName } });
    return role?.id ?? null;
};

/** Role names that carry unrestricted (Super Admin) access. */
const TOP_ROLES = ["OWNER", "SUPER_ADMIN"];

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body ?? {};

        if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });

        if (!admin) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        if (admin.status === AdminAccountStatus.SUSPENDED) {
            return res.status(403).json({ message: "Your administrator account has been suspended. Please contact the Super Admin." });
        }

        if (admin.status === AdminAccountStatus.DISABLED || !admin.isActive) {
            return res.status(403).json({ message: "Your account is disabled. Please contact an administrator." });
        }

        if (admin.status === AdminAccountStatus.PENDING_INVITATION) {
            return res.status(403).json({ message: "Your administrator invitation has not been accepted yet. Please use the link sent to your email." });
        }

        if (admin.status === AdminAccountStatus.PENDING_APPROVAL) {
            return res.status(403).json({ message: "Your administrator account is pending Super Admin approval." });
        }

        if (admin.status === AdminAccountStatus.EXPIRED) {
            return res.status(403).json({ message: "Your administrator invitation or access has expired." });
        }

        if (!admin.passwordHash) {
            return res.status(401).json({ message: "This account is configured for Google Sign-In. Please sign in with Google." });
        }

        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const accessToken = signAccessToken(admin.id);
        const refreshToken = signRefreshToken(admin.id);
        const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

        // Clean up expired sessions for this admin
        await prisma.refreshToken.deleteMany({
            where: {
                userId: admin.id,
                userType: "ADMIN",
                expiresAt: { lt: new Date() }
            }
        }).catch(() => {});

        // If an existing refresh token was provided from this client, revoke it to replace the current device session
        const existingTokens = extractCandidateTokens(req, "admin_refresh", "x-refresh-token");
        for (const token of existingTokens) {
            try {
                const oldHash = crypto.createHash("sha256").update(token).digest("hex");
                await prisma.refreshToken.updateMany({
                    where: { tokenHash: oldHash, userId: admin.id, userType: "ADMIN", revoked: false },
                    data: { revoked: true }
                });
            } catch {}
        }

        // Deduplicate rapid retries / concurrent logins within 10 seconds for this admin
        const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
        await prisma.refreshToken.updateMany({
            where: {
                userId: admin.id,
                userType: "ADMIN",
                revoked: false,
                createdAt: { gte: tenSecondsAgo }
            },
            data: { revoked: true }
        }).catch(() => {});

        await prisma.$transaction([
            prisma.refreshToken.create({
                data: { userId: admin.id, userType: "ADMIN", tokenHash: refreshHash, expiresAt }
            }),
            prisma.admin.update({
                where: { id: admin.id },
                data: { lastLoginAt: new Date() }
            })
        ]);

        setAuthCookie(res, "admin_session", accessToken);
        setRefreshCookie(res, refreshToken);

        return res.status(200).json({
            message: "Login successful",
            admin: {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                isSuperAdmin: admin.isSuperAdmin,
                role: admin.role,
                status: admin.status
            }
        });
    } catch (error: unknown) {
        console.error("ADMIN LOGIN ERROR:", error);
        return res.status(500).json({ message: "Unable to sign in right now. Please try again later." });
    }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = async (req: Request, res: Response) => {
    try {
        clearAuthCookie(res, "admin_session");
        clearRefreshCookie(res);
        if (req.adminId) {
            await prisma.refreshToken.updateMany({
                where: { userId: req.adminId, userType: "ADMIN", revoked: false },
                data: { revoked: true }
            });
            disconnectActorSockets(req.adminId, "Logged out", "ADMIN");
        }
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error: any) {
        console.error("ADMIN LOGOUT ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refresh = async (req: Request, res: Response) => {
    try {
        const candidateTokens = extractCandidateTokens(req, "admin_refresh", "x-refresh-token");
        if (candidateTokens.length === 0) {
            return res.status(401).json({ message: "No refresh token" });
        }

        for (const token of candidateTokens) {
            let payload: any;
            try {
                payload = verifyRefreshToken(token) as any;
            } catch {
                continue;
            }

            const userId = payload?.id as string;
            if (!userId) continue;

            const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
            const stored = await prisma.refreshToken.findFirst({
                where: { tokenHash, userId, userType: "ADMIN", revoked: false, expiresAt: { gt: new Date() } }
            });
            if (!stored) continue;

            await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

            const newRefresh = signRefreshToken(userId);
            const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
            await prisma.refreshToken.create({ data: { userId, userType: "ADMIN", tokenHash: newHash, expiresAt } });

            const accessToken = signAccessToken(userId);
            setAuthCookie(res, "admin_session", accessToken);
            setRefreshCookie(res, newRefresh);

            return res.status(200).json({ message: "Refreshed" });
        }

        return res.status(401).json({ message: "Invalid refresh token" });
    } catch (error: any) {
        console.error("ADMIN REFRESH ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Setup Status ─────────────────────────────────────────────────────────────

export const getSetupStatus = async (_req: Request, res: Response) => {
    try {
        const count = await prisma.admin.count();
        const isSetup = count > 0;
        return res.status(200).json({ isSetup, initialized: isSetup });
    } catch (error: any) {
        console.error("ADMIN SETUP STATUS ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── First Admin Setup ────────────────────────────────────────────────────────

export const setupFirstAdmin = async (req: Request, res: Response) => {
    try {
        if (await prisma.admin.count() > 0) {
            return res.status(409).json({ message: "Administrator setup has already been completed." });
        }

        const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
        const suppliedSecret = req.get("x-admin-bootstrap-secret");
        if (!configuredSecret || Buffer.byteLength(configuredSecret, "utf8") < 32) {
            return res.status(503).json({ message: "Initial administrator setup is unavailable." });
        }

        const { name, email, password } = req.body ?? {};

        if (typeof suppliedSecret !== "string" || !suppliedSecret) {
            return res.status(403).json({ message: "Invalid setup credentials." });
        }

        const configuredDigest = crypto.createHash("sha256").update(configuredSecret).digest();
        const suppliedDigest = crypto.createHash("sha256").update(suppliedSecret).digest();
        if (!crypto.timingSafeEqual(configuredDigest, suppliedDigest)) {
            return res.status(403).json({ message: "Invalid setup credentials." });
        }

        if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedName || normalizedName.length > 201 || normalizedEmail.length > 320) {
            return res.status(400).json({ message: "Enter a valid name and email address." });
        }
        if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({ message: "Password must be 12 to 72 bytes long." });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        const nameParts = normalizedName.split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "";
        if (firstName.length > 100 || lastName.length > 100) {
            return res.status(400).json({ message: "Name is too long." });
        }

        const newAdmin = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('admin_initial_bootstrap'))`;

            if (await tx.admin.count() > 0) {
                return null;
            }

            const superAdminRole = await tx.adminRole.findUnique({
                where: { name: "SUPER_ADMIN" },
                select: { id: true }
            });
            if (!superAdminRole) {
                throw new Error("Required SUPER_ADMIN role is not configured.");
            }

            return tx.admin.create({
                data: {
                    email: normalizedEmail,
                    passwordHash,
                    firstName,
                    lastName,
                    isSuperAdmin: true,
                    role: "SUPER_ADMIN",
                    roleId: superAdminRole.id,
                    isActive: true,
                    status: AdminAccountStatus.ACTIVE,
                    authProvider: "EMAIL"
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    isSuperAdmin: true,
                    role: true,
                    status: true
                }
            });
        });

        if (!newAdmin) {
            return res.status(409).json({ message: "Administrator setup has already been completed." });
        }

        await logAdminAction({
            adminId: newAdmin.id,
            actionType: AdminActionType.ADMIN_CREATED,
            targetType: "Admin",
            targetId: newAdmin.id,
            description: "Initial Super Admin account created through the one-time bootstrap flow.",
            newValue: {
                email: newAdmin.email,
                role: newAdmin.role,
                isSuperAdmin: newAdmin.isSuperAdmin
            },
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });

        return res.status(201).json({
            message: "Super Admin created successfully",
            admin: newAdmin
        });
    } catch (error: unknown) {
        console.error("SETUP FIRST ADMIN ERROR:", error);
        return res.status(500).json({ message: "Unable to complete administrator setup right now." });
    }
};

// ─── Get Profile ──────────────────────────────────────────────────────────────

export const getProfile = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                avatarPublicId: true,
                isSuperAdmin: true,
                isActive: true,
                status: true,
                role: true,
                roleId: true,
                adminRole: { select: { name: true, displayName: true } },
                authProvider: true,
                lastLoginAt: true,
                createdAt: true
            }
        });

        if (!admin) {
            return res.status(404).json({ message: "Admin profile not found" });
        }

        const { adminRole, ...rest } = admin;
        const permissions = await getAdminPermissions(adminId);

        return res.status(200).json({
            admin: {
                ...rest,
                roleName: adminRole?.displayName ?? adminRole?.name ?? rest.role,
                permissions
            }
        });
    } catch (error: any) {
        console.error("ADMIN GET PROFILE ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Update Profile ───────────────────────────────────────────────────────────

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { name, firstName: bodyFirstName, lastName: bodyLastName, phone, avatarUrl, avatarPublicId } = req.body;

        let firstName: string | undefined = bodyFirstName;
        let lastName: string | undefined = bodyLastName;

        if (name !== undefined) {
            const nameParts = (name as string).trim().split(/\s+/);
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
        }

        const previous = await prisma.admin.findUnique({
            where: { id: adminId },
            select: { avatarPublicId: true }
        });

        const updatedAdmin = await prisma.admin.update({
            where: { id: adminId },
            data: {
                ...(firstName !== undefined ? { firstName } : {}),
                ...(lastName !== undefined ? { lastName } : {}),
                ...(phone !== undefined ? { phone } : {}),
                ...(avatarUrl !== undefined ? { avatarUrl } : {}),
                ...(avatarPublicId !== undefined ? { avatarPublicId: avatarPublicId || null } : {})
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                avatarPublicId: true,
                isSuperAdmin: true,
                isActive: true,
                status: true,
                role: true,
                authProvider: true,
                updatedAt: true
            }
        });

        if (previous?.avatarPublicId && previous.avatarPublicId !== updatedAdmin.avatarPublicId) {
            try {
                await storageService.deleteImage({ publicId: previous.avatarPublicId });
            } catch (error) {
                console.error("FAILED TO REMOVE REPLACED ADMIN AVATAR:", error);
            }
        }

        await logAdminAction({
            adminId,
            actionType: AdminActionType.ADMIN_UPDATED,
            targetType: "Admin",
            targetId: adminId,
            description: "Updated profile details",
            newValue: { firstName: updatedAdmin.firstName, lastName: updatedAdmin.lastName, phone: updatedAdmin.phone },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: "Profile updated successfully",
            admin: updatedAdmin
        });
    } catch (error: any) {
        console.error("ADMIN UPDATE PROFILE ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Remove Avatar ────────────────────────────────────────────────────────────

export const removeAvatar = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) return res.status(401).json({ message: "Unauthorized" });

        const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { avatarPublicId: true } });
        if (admin?.avatarPublicId) {
            try {
                await storageService.deleteImage({ publicId: admin.avatarPublicId });
            } catch (error) {
                console.error("ERROR DELETING AVATAR ASSET:", error);
            }
        }

        await prisma.admin.update({
            where: { id: adminId },
            data: { avatarUrl: null, avatarPublicId: null }
        });

        return res.status(200).json({ message: "Profile picture removed successfully" });
    } catch (error: any) {
        console.error("REMOVE AVATAR ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Update Password ──────────────────────────────────────────────────────────

export const updatePassword = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New passwords do not match" });
        }

        const admin = await prisma.admin.findUnique({ where: { id: adminId } });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        if (admin.passwordHash) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Current password is required to change password" });
            }
            const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
            if (!isMatch) {
                return res.status(400).json({ message: "Incorrect current password" });
            }
            const isSame = await bcrypt.compare(newPassword, admin.passwordHash);
            if (isSame) {
                return res.status(400).json({ message: "New password must not be identical to your current password." });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        const newAuthProvider =
            admin.authProvider === "GOOGLE" ? "EMAIL_AND_GOOGLE" : admin.authProvider;

        await prisma.admin.update({
            where: { id: adminId },
            data: { passwordHash, authProvider: newAuthProvider }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.ADMIN_PASSWORD_CHANGED,
            targetType: "Admin",
            targetId: adminId,
            description: "Changed password successfully",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error: any) {
        console.error("ADMIN UPDATE PASSWORD ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Change Email Request ─────────────────────────────────────────────────────

export const requestEmailChange = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) return res.status(401).json({ message: "Unauthorized" });

        const { newEmail, currentPassword } = req.body;
        if (!newEmail || typeof newEmail !== "string") {
            return res.status(400).json({ message: "A valid new email address is required" });
        }

        const normalizedNewEmail = newEmail.trim().toLowerCase();
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(normalizedNewEmail)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const admin = await prisma.admin.findUnique({ where: { id: adminId } });
        if (!admin) return res.status(404).json({ message: "Admin account not found" });

        if (admin.email === normalizedNewEmail) {
            return res.status(400).json({ message: "New email cannot be the same as your current email" });
        }

        // Re-authenticate if password exists
        if (admin.passwordHash) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Please enter your current password to authorize email change." });
            }
            const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
            if (!isMatch) {
                return res.status(400).json({ message: "Incorrect password. Email change authorization failed." });
            }
        }

        // Prevent duplicate email
        const existing = await prisma.admin.findUnique({ where: { email: normalizedNewEmail } });
        if (existing) {
            return res.status(409).json({ message: "This email address is already assigned to another administrator account." });
        }

        // Cancel previous pending requests
        await prisma.adminEmailChange.updateMany({
            where: { adminId, status: EmailChangeStatus.PENDING },
            data: { status: EmailChangeStatus.CANCELLED }
        });

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 mins

        await prisma.adminEmailChange.create({
            data: {
                adminId,
                currentEmail: admin.email,
                newEmail: normalizedNewEmail,
                tokenHash,
                status: EmailChangeStatus.PENDING,
                expiresAt
            }
        });

        const adminFrontendUrl = (process.env.ADMIN_FRONTEND_URL || "http://localhost:8001").replace(/\/$/, "");
        const verifyUrl = `${adminFrontendUrl}/verify-email-change?token=${rawToken}`;

        await Promise.all([
            EmailService.sendAdminEmailChangeVerification(normalizedNewEmail, {
                verifyUrl,
                expiresMinutes: 60
            }),
            EmailService.sendAdminEmailChangeAlert(admin.email, {
                newEmail: normalizedNewEmail
            })
        ]);

        await logAdminAction({
            adminId,
            actionType: AdminActionType.ADMIN_EMAIL_CHANGE_REQUESTED,
            targetType: "Admin",
            targetId: adminId,
            description: `Requested email change from ${admin.email} to ${normalizedNewEmail}`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: `Verification link sent to ${normalizedNewEmail}. Please check your inbox to confirm the change.`
        });
    } catch (error: any) {
        console.error("ADMIN REQUEST EMAIL CHANGE ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Verify Email Change ──────────────────────────────────────────────────────

export const verifyEmailChange = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token || typeof token !== "string") {
            return res.status(400).json({ message: "Verification token is required" });
        }

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const request = await prisma.adminEmailChange.findUnique({
            where: { tokenHash }
        });

        if (!request || request.status !== EmailChangeStatus.PENDING) {
            return res.status(400).json({ message: "Invalid or already used email verification link." });
        }

        if (new Date() > request.expiresAt) {
            await prisma.adminEmailChange.update({
                where: { id: request.id },
                data: { status: EmailChangeStatus.EXPIRED }
            });
            return res.status(400).json({ message: "This email verification link has expired. Please request a new one." });
        }

        const duplicate = await prisma.admin.findUnique({ where: { email: request.newEmail } });
        if (duplicate && duplicate.id !== request.adminId) {
            return res.status(409).json({ message: "This email address is already in use by another administrator." });
        }

        const updatedAdmin = await prisma.admin.update({
            where: { id: request.adminId },
            data: { email: request.newEmail }
        });

        await prisma.adminEmailChange.update({
            where: { id: request.id },
            data: { status: EmailChangeStatus.VERIFIED, verifiedAt: new Date() }
        });

        // Revoke active sessions to force re-login with verified email
        await prisma.refreshToken.updateMany({
            where: { userId: updatedAdmin.id, userType: "ADMIN", revoked: false },
            data: { revoked: true }
        });

        await logAdminAction({
            adminId: updatedAdmin.id,
            actionType: AdminActionType.ADMIN_EMAIL_CHANGED,
            targetType: "Admin",
            targetId: updatedAdmin.id,
            description: `Admin email changed from ${request.currentEmail} to ${request.newEmail}`,
            previousValue: { email: request.currentEmail },
            newValue: { email: request.newEmail },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: "Email address verified and updated successfully. Please sign in with your new email."
        });
    } catch (error: any) {
        console.error("VERIFY EMAIL CHANGE ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Google OAuth & Approval Flow ─────────────────────────────────────────────

export const googleOAuth = async (req: Request, res: Response) => {
    try {
        let email: string | undefined;
        let googleId: string | undefined;
        let firstName = "";
        let lastName = "";
        let avatarUrl = "";

        const {
            idToken,
            email: bodyEmail,
            name: bodyName,
            firstName: bodyFirstName,
            lastName: bodyLastName,
            avatarUrl: bodyAvatarUrl,
            providerId,
            googleId: bodyGoogleId
        } = req.body;

        if (idToken) {
            const audience = process.env.GOOGLE_CLIENT_ID;
            if (!audience) {
                return res.status(500).json({ message: "Google client ID is not configured" });
            }

            const ticket = await googleClient.verifyIdToken({ idToken, audience });
            const payload = ticket.getPayload();

            if (!payload || !payload.email) {
                return res.status(401).json({ message: "Invalid Google token" });
            }

            if (!payload.email_verified) {
                return res.status(403).json({ message: "Google email address is not verified by Google." });
            }

            email = payload.email.trim().toLowerCase();
            googleId = payload.sub;
            firstName = payload.given_name ?? "";
            lastName = payload.family_name ?? "";
            avatarUrl = payload.picture ?? "";
        } else if (
            bodyEmail &&
            process.env.NODE_ENV !== "production" &&
            process.env.ALLOW_UNVERIFIED_GOOGLE === "true"
        ) {
            email = (bodyEmail as string).trim().toLowerCase();
            googleId = (providerId || bodyGoogleId || `google_${bodyEmail}`) as string;
            firstName = (bodyFirstName || "") as string;
            lastName = (bodyLastName || "") as string;
            avatarUrl = (bodyAvatarUrl || "") as string;
            if (bodyName && !firstName) {
                const nameParts = (bodyName as string).trim().split(/\s+/);
                firstName = nameParts[0] || "";
                lastName = nameParts.slice(1).join(" ") || "";
            }
        } else {
            return res.status(400).json({ message: "A valid Google ID token is required" });
        }

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const count = await prisma.admin.count();
        let admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });

        // Initial setup via Google if zero admins exist
        if (count === 0) {
            const superAdminRoleId = await resolveAdminRoleId("SUPER_ADMIN");
            admin = await prisma.admin.create({
                data: {
                    email: normalizedEmail,
                    firstName: firstName || "Admin",
                    lastName: lastName || "",
                    avatarUrl,
                    googleId,
                    authProvider: "GOOGLE",
                    isSuperAdmin: true,
                    role: "SUPER_ADMIN",
                    ...(superAdminRoleId ? { roleId: superAdminRoleId } : {}),
                    isActive: true,
                    status: AdminAccountStatus.ACTIVE
                }
            });
        } else {
            // Existing platform admins:
            if (!admin) {
                // Check if this email has an approved/pending invitation!
                const invitation = await prisma.adminInvitation.findFirst({
                    where: { email: normalizedEmail, status: AdminInvitationStatus.PENDING },
                    orderBy: { createdAt: "desc" }
                });

                if (invitation) {
                    if (new Date() > invitation.expiresAt) {
                        await prisma.adminInvitation.update({
                            where: { id: invitation.id },
                            data: { status: AdminInvitationStatus.EXPIRED }
                        });
                        return res.status(403).json({
                            message: "Your administrator invitation has expired. Please ask your Super Admin to send a new invitation."
                        });
                    }

                    // Onboarding from invitation!
                    const isSuper = TOP_ROLES.includes(invitation.roleName);
                    admin = await prisma.admin.create({
                        data: {
                            email: normalizedEmail,
                            firstName: firstName || invitation.fullName?.split(" ")[0] || "Admin",
                            lastName: lastName || invitation.fullName?.split(" ").slice(1).join(" ") || "",
                            avatarUrl,
                            googleId,
                            authProvider: "GOOGLE",
                            role: invitation.roleName,
                            roleId: invitation.roleId,
                            isSuperAdmin: isSuper,
                            isActive: true,
                            status: AdminAccountStatus.ACTIVE
                        }
                    });

                    await prisma.adminInvitation.update({
                        where: { id: invitation.id },
                        data: { status: AdminInvitationStatus.ACCEPTED, acceptedAt: new Date() }
                    });

                    await logAdminAction({
                        adminId: admin.id,
                        actionType: AdminActionType.ADMIN_INVITATION_ACCEPTED,
                        targetType: "Admin",
                        targetId: admin.id,
                        description: `Administrator invitation accepted via Google OAuth with role ${invitation.roleName}`,
                        ipAddress: req.ip,
                        userAgent: req.headers["user-agent"]
                    });
                } else {
                    // Check or create a Pending Access Request with 24h expiry
                    const existingRequest = await prisma.adminAccessRequest.findFirst({
                        where: { email: normalizedEmail },
                        orderBy: { createdAt: "desc" }
                    });

                    const now = new Date();
                    if (existingRequest && existingRequest.status === AccessRequestStatus.PENDING && existingRequest.expiresAt > now) {
                        return res.status(403).json({
                            pendingApproval: true,
                            message: "Administrator approval is required. Your access request is currently pending review by the Super Admin."
                        });
                    }

                    // Create or renew a 24-hour access request
                    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
                    await prisma.adminAccessRequest.create({
                        data: {
                            email: normalizedEmail,
                            googleId,
                            firstName,
                            lastName,
                            avatarUrl,
                            status: AccessRequestStatus.PENDING,
                            expiresAt
                        }
                    });

                    return res.status(403).json({
                        pendingApproval: true,
                        message: "Administrator approval is required. An access request has been submitted to the Super Admin (expires in 24 hours)."
                    });
                }
            }

            // Admin account exists: verify status
            if (admin.status === AdminAccountStatus.SUSPENDED) {
                return res.status(403).json({ message: "Your administrator account has been suspended. Please contact the Super Admin." });
            }

            if (admin.status === AdminAccountStatus.DISABLED || !admin.isActive) {
                return res.status(403).json({ message: "Your administrator account is disabled." });
            }

            if (admin.status === AdminAccountStatus.PENDING_APPROVAL) {
                return res.status(403).json({ message: "Your administrator account is awaiting Super Admin approval." });
            }

            const newAuthProvider =
                admin.authProvider === "EMAIL" ? "EMAIL_AND_GOOGLE" : admin.authProvider;

            admin = await prisma.admin.update({
                where: { id: admin.id },
                data: {
                    googleId: googleId || admin.googleId,
                    authProvider: newAuthProvider,
                    avatarUrl: avatarUrl || admin.avatarUrl,
                    lastLoginAt: new Date(),
                    status: AdminAccountStatus.ACTIVE,
                    isActive: true
                }
            });
        }

        const accessToken = signAccessToken(admin.id);
        const refreshToken = signRefreshToken(admin.id);
        const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

        // Clean up expired sessions for this admin
        await prisma.refreshToken.deleteMany({
            where: {
                userId: admin.id,
                userType: "ADMIN",
                expiresAt: { lt: new Date() }
            }
        }).catch(() => {});

        // If an existing refresh token was provided from this client, revoke it
        const existingInvitationTokens = extractCandidateTokens(req, "admin_refresh", "x-refresh-token");
        for (const token of existingInvitationTokens) {
            try {
                const oldHash = crypto.createHash("sha256").update(token).digest("hex");
                await prisma.refreshToken.updateMany({
                    where: { tokenHash: oldHash, userId: admin.id, userType: "ADMIN", revoked: false },
                    data: { revoked: true }
                });
            } catch {}
        }

        // Deduplicate rapid retries / concurrent logins within 10 seconds
        const tenSecondsAgoInvitation = new Date(Date.now() - 10 * 1000);
        await prisma.refreshToken.updateMany({
            where: {
                userId: admin.id,
                userType: "ADMIN",
                revoked: false,
                createdAt: { gte: tenSecondsAgoInvitation }
            },
            data: { revoked: true }
        }).catch(() => {});

        await prisma.refreshToken.create({
            data: { userId: admin.id, userType: "ADMIN", tokenHash: refreshHash, expiresAt }
        });

        setAuthCookie(res, "admin_session", accessToken);
        setRefreshCookie(res, refreshToken);

        await logAdminAction({
            adminId: admin.id,
            actionType: AdminActionType.ADMIN_UPDATED,
            targetType: "Admin",
            targetId: admin.id,
            description: "Signed in successfully via Google OAuth",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: "Google login successful",
            admin: {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                isSuperAdmin: admin.isSuperAdmin,
                role: admin.role,
                status: admin.status
            }
        });
    } catch (error: any) {
        console.error("ADMIN GOOGLE OAUTH ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── List Admins (Super Admin / Authorized) ───────────────────────────────────

export const listAdmins = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const allowed = caller.isSuperAdmin || (await hasPermission(caller.id, "admin.users.manage"));
        if (!allowed) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const rows = await prisma.admin.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                isActive: true,
                status: true,
                isSuperAdmin: true,
                role: true,
                roleId: true,
                adminRole: { select: { id: true, name: true, displayName: true } },
                lastLoginAt: true,
                createdAt: true,
                authProvider: true
            }
        });

        const admins = rows.map(({ adminRole, ...rest }) => ({
            ...rest,
            roleName: adminRole?.displayName ?? adminRole?.name ?? rest.role
        }));

        return res.status(200).json({ admins });
    } catch (error: any) {
        console.error("LIST ADMINS ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Invite Admin (Super Admin / Authorized) ──────────────────────────────────

export const inviteAdmin = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller) return res.status(401).json({ message: "Unauthorized" });

        const allowed = caller.isSuperAdmin || (await hasPermission(caller.id, "admin.users.manage"));
        if (!allowed) return res.status(403).json({ message: "Forbidden: Admin management permission required." });

        const { email, fullName, phone, roleId, role } = req.body;
        if (!email || typeof email !== "string") {
            return res.status(400).json({ message: "A valid email address is required." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingAdmin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
        if (existingAdmin && existingAdmin.status === AdminAccountStatus.ACTIVE) {
            return res.status(409).json({ message: "An active administrator with this email already exists." });
        }

        let roleRow = null;
        if (roleId) {
            roleRow = await prisma.adminRole.findUnique({ where: { id: String(roleId) } });
        } else if (role) {
            roleRow = await prisma.adminRole.findUnique({ where: { name: String(role).toUpperCase() } });
        }
        if (!roleRow) {
            return res.status(400).json({ message: "Please select a valid administrator role." });
        }

        const isSuper = TOP_ROLES.includes(roleRow.name);
        if (isSuper && !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Only Super Admins can invite another Super Admin." });
        }

        // Cancel previous pending invitations for this email
        await prisma.adminInvitation.updateMany({
            where: { email: normalizedEmail, status: AdminInvitationStatus.PENDING },
            data: { status: AdminInvitationStatus.REVOKED, revokedAt: new Date() }
        });

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const invitation = await prisma.adminInvitation.create({
            data: {
                email: normalizedEmail,
                fullName: fullName ? String(fullName).trim() : null,
                phone: phone ? String(phone).trim() : null,
                roleId: roleRow.id,
                roleName: roleRow.name,
                tokenHash,
                invitedById: caller.id,
                status: AdminInvitationStatus.PENDING,
                expiresAt
            }
        });

        const adminFrontendUrl = (process.env.ADMIN_FRONTEND_URL || "http://localhost:8001").replace(/\/$/, "");
        const inviteUrl = `${adminFrontendUrl}/accept-invitation?token=${rawToken}`;

        await EmailService.sendAdminInvitation(normalizedEmail, {
            recipientName: fullName || undefined,
            inviteUrl,
            roleName: roleRow.displayName || roleRow.name,
            expiresHours: 24
        });

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.ADMIN_INVITATION_SENT,
            targetType: "AdminInvitation",
            targetId: invitation.id,
            description: `Sent administrator invitation to '${normalizedEmail}' with role '${roleRow.displayName}'`,
            newValue: { email: normalizedEmail, role: roleRow.name, roleId: roleRow.id },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({
            message: `Invitation successfully sent to ${normalizedEmail} (expires in 24 hours).`,
            invitation: {
                id: invitation.id,
                email: invitation.email,
                roleName: roleRow.displayName || roleRow.name,
                status: invitation.status,
                expiresAt: invitation.expiresAt
            }
        });
    } catch (error: any) {
        console.error("INVITE ADMIN ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Get Invitation Details by Token (Public) ─────────────────────────────────

export const getInvitationByToken = async (req: Request, res: Response) => {
    try {
        const token = req.query.token as string;
        if (!token) return res.status(400).json({ message: "Invitation token is required" });

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const invitation = await prisma.adminInvitation.findUnique({
            where: { tokenHash },
            include: { adminRole: { select: { displayName: true, name: true, description: true } } }
        });

        if (!invitation || invitation.status !== AdminInvitationStatus.PENDING) {
            return res.status(400).json({ message: "This invitation link is invalid or has already been used." });
        }

        if (new Date() > invitation.expiresAt) {
            await prisma.adminInvitation.update({
                where: { id: invitation.id },
                data: { status: AdminInvitationStatus.EXPIRED }
            });
            return res.status(400).json({ message: "This invitation has expired after 24 hours. Please ask your administrator to issue a new invitation." });
        }

        return res.status(200).json({
            invitation: {
                email: invitation.email,
                fullName: invitation.fullName,
                roleName: invitation.adminRole?.displayName || invitation.roleName,
                roleDescription: invitation.adminRole?.description,
                expiresAt: invitation.expiresAt
            }
        });
    } catch (error: any) {
        console.error("GET INVITATION ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Accept Invitation (Public) ───────────────────────────────────────────────

export const acceptInvitation = async (req: Request, res: Response) => {
    try {
        const { token, password, firstName, lastName, phone } = req.body;
        if (!token || !password) {
            return res.status(400).json({ message: "Invitation token and password are required." });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const invitation = await prisma.adminInvitation.findUnique({
            where: { tokenHash }
        });

        if (!invitation || invitation.status !== AdminInvitationStatus.PENDING) {
            return res.status(400).json({ message: "This invitation is invalid or has already been used." });
        }

        if (new Date() > invitation.expiresAt) {
            await prisma.adminInvitation.update({
                where: { id: invitation.id },
                data: { status: AdminInvitationStatus.EXPIRED }
            });
            return res.status(400).json({ message: "This invitation has expired after 24 hours. Please request a new invitation." });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const existingAdmin = await prisma.admin.findUnique({ where: { email: invitation.email } });
        let admin;

        const isSuper = TOP_ROLES.includes(invitation.roleName);
        const finalFirstName = firstName || invitation.fullName?.split(" ")[0] || "Admin";
        const finalLastName = lastName || invitation.fullName?.split(" ").slice(1).join(" ") || "";

        if (existingAdmin) {
            admin = await prisma.admin.update({
                where: { id: existingAdmin.id },
                data: {
                    passwordHash,
                    firstName: finalFirstName,
                    lastName: finalLastName,
                    phone: phone || invitation.phone || existingAdmin.phone,
                    role: invitation.roleName,
                    roleId: invitation.roleId,
                    isSuperAdmin: isSuper,
                    isActive: true,
                    status: AdminAccountStatus.ACTIVE,
                    authProvider: "EMAIL"
                }
            });
        } else {
            admin = await prisma.admin.create({
                data: {
                    email: invitation.email,
                    passwordHash,
                    firstName: finalFirstName,
                    lastName: finalLastName,
                    phone: phone || invitation.phone,
                    role: invitation.roleName,
                    roleId: invitation.roleId,
                    isSuperAdmin: isSuper,
                    isActive: true,
                    status: AdminAccountStatus.ACTIVE,
                    authProvider: "EMAIL"
                }
            });
        }

        await prisma.adminInvitation.update({
            where: { id: invitation.id },
            data: { status: AdminInvitationStatus.ACCEPTED, acceptedAt: new Date() }
        });

        const accessToken = signAccessToken(admin.id);
        const refreshToken = signRefreshToken(admin.id);
        const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

        // Clean up expired sessions for this admin
        await prisma.refreshToken.deleteMany({
            where: {
                userId: admin.id,
                userType: "ADMIN",
                expiresAt: { lt: new Date() }
            }
        }).catch(() => {});

        // If an existing refresh token was provided from this client, revoke it
        const existingInvitationTokens = extractCandidateTokens(req, "admin_refresh", "x-refresh-token");
        for (const token of existingInvitationTokens) {
            try {
                const oldHash = crypto.createHash("sha256").update(token).digest("hex");
                await prisma.refreshToken.updateMany({
                    where: { tokenHash: oldHash, userId: admin.id, userType: "ADMIN", revoked: false },
                    data: { revoked: true }
                });
            } catch {}
        }

        // Deduplicate rapid retries / concurrent logins within 10 seconds
        const tenSecondsAgoInvitation = new Date(Date.now() - 10 * 1000);
        await prisma.refreshToken.updateMany({
            where: {
                userId: admin.id,
                userType: "ADMIN",
                revoked: false,
                createdAt: { gte: tenSecondsAgoInvitation }
            },
            data: { revoked: true }
        }).catch(() => {});

        await prisma.refreshToken.create({
            data: { userId: admin.id, userType: "ADMIN", tokenHash: refreshHash, expiresAt }
        });

        setAuthCookie(res, "admin_session", accessToken);
        setRefreshCookie(res, refreshToken);

        await logAdminAction({
            adminId: admin.id,
            actionType: AdminActionType.ADMIN_INVITATION_ACCEPTED,
            targetType: "Admin",
            targetId: admin.id,
            description: `Invitation accepted and credentials configured for role ${invitation.roleName}`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: "Administrator account activated successfully.",
            admin: {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                role: admin.role,
                isSuperAdmin: admin.isSuperAdmin
            }
        });
    } catch (error: any) {
        console.error("ACCEPT INVITATION ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── List Invitations (Super Admin / Authorized) ──────────────────────────────

export const listInvitations = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || (!caller.isSuperAdmin && !(await hasPermission(caller.id, "admin.users.manage")))) {
            return res.status(403).json({ message: "Forbidden: Admin management permission required." });
        }

        // Auto-update expired invitations
        await prisma.adminInvitation.updateMany({
            where: { status: AdminInvitationStatus.PENDING, expiresAt: { lt: new Date() } },
            data: { status: AdminInvitationStatus.EXPIRED }
        });

        const invitations = await prisma.adminInvitation.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                adminRole: { select: { displayName: true, name: true } },
                invitedBy: { select: { firstName: true, lastName: true, email: true } }
            }
        });

        return res.status(200).json({ invitations });
    } catch (error: any) {
        console.error("LIST INVITATIONS ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Resend Invitation (Super Admin / Authorized) ─────────────────────────────

export const resendInvitation = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || (!caller.isSuperAdmin && !(await hasPermission(caller.id, "admin.users.manage")))) {
            return res.status(403).json({ message: "Forbidden: Admin management permission required." });
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const existing = await prisma.adminInvitation.findUnique({
            where: { id },
            include: { adminRole: true }
        });

        if (!existing) return res.status(404).json({ message: "Invitation not found." });

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const updated = await prisma.adminInvitation.update({
            where: { id },
            data: {
                tokenHash,
                status: AdminInvitationStatus.PENDING,
                expiresAt,
                revokedAt: null
            }
        });

        const adminFrontendUrl = (process.env.ADMIN_FRONTEND_URL || "http://localhost:8001").replace(/\/$/, "");
        const inviteUrl = `${adminFrontendUrl}/accept-invitation?token=${rawToken}`;

        await EmailService.sendAdminInvitation(existing.email, {
            recipientName: existing.fullName || undefined,
            inviteUrl,
            roleName: existing.adminRole?.displayName || existing.roleName,
            expiresHours: 24
        });

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.ADMIN_INVITATION_SENT,
            targetType: "AdminInvitation",
            targetId: updated.id,
            description: `Re-sent administrator invitation to '${existing.email}'`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ message: `New invitation email sent to ${existing.email}.` });
    } catch (error: any) {
        console.error("RESEND INVITATION ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Revoke Invitation (Super Admin / Authorized) ─────────────────────────────

export const revokeInvitation = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || (!caller.isSuperAdmin && !(await hasPermission(caller.id, "admin.users.manage")))) {
            return res.status(403).json({ message: "Forbidden: Admin management permission required." });
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await prisma.adminInvitation.update({
            where: { id },
            data: { status: AdminInvitationStatus.REVOKED, revokedAt: new Date() }
        });

        return res.status(200).json({ message: "Invitation revoked successfully." });
    } catch (error: any) {
        console.error("REVOKE INVITATION ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── List Access Requests (Super Admin) ───────────────────────────────────────

export const listAccessRequests = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        // Auto-expire pending requests older than 24 hours
        await prisma.adminAccessRequest.updateMany({
            where: { status: AccessRequestStatus.PENDING, expiresAt: { lt: new Date() } },
            data: { status: AccessRequestStatus.EXPIRED }
        });

        const requests = await prisma.adminAccessRequest.findMany({
            orderBy: { createdAt: "desc" },
            include: { reviewedBy: { select: { firstName: true, lastName: true, email: true } } }
        });

        return res.status(200).json({ requests });
    } catch (error: any) {
        console.error("LIST ACCESS REQUESTS ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Approve Access Request (Super Admin) ─────────────────────────────────────

export const approveAccessRequest = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { roleId, notes } = req.body;

        if (!roleId) {
            return res.status(400).json({ message: "Role assignment is required to approve access." });
        }

        const request = await prisma.adminAccessRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ message: "Access request not found." });

        if (request.status !== AccessRequestStatus.PENDING) {
            return res.status(400).json({ message: `Request is already ${request.status.toLowerCase()}.` });
        }

        if (new Date() > request.expiresAt) {
            await prisma.adminAccessRequest.update({
                where: { id },
                data: { status: AccessRequestStatus.EXPIRED }
            });
            return res.status(400).json({ message: "This request has expired after 24 hours. A new request or invitation is required." });
        }

        const roleRow = await prisma.adminRole.findUnique({ where: { id: roleId } });
        if (!roleRow) return res.status(400).json({ message: "Invalid role selected." });

        const isSuper = TOP_ROLES.includes(roleRow.name);
        let admin = await prisma.admin.findUnique({ where: { email: request.email } });

        if (admin) {
            admin = await prisma.admin.update({
                where: { id: admin.id },
                data: {
                    role: roleRow.name,
                    roleId: roleRow.id,
                    isSuperAdmin: isSuper,
                    status: AdminAccountStatus.ACTIVE,
                    isActive: true,
                    authProvider: "GOOGLE",
                    googleId: request.googleId || admin.googleId
                }
            });
        } else {
            admin = await prisma.admin.create({
                data: {
                    email: request.email,
                    firstName: request.firstName || "Admin",
                    lastName: request.lastName || "",
                    avatarUrl: request.avatarUrl,
                    googleId: request.googleId,
                    role: roleRow.name,
                    roleId: roleRow.id,
                    isSuperAdmin: isSuper,
                    status: AdminAccountStatus.ACTIVE,
                    isActive: true,
                    authProvider: "GOOGLE"
                }
            });
        }

        await prisma.adminAccessRequest.update({
            where: { id },
            data: {
                status: AccessRequestStatus.APPROVED,
                reviewedById: caller.id,
                reviewedAt: new Date(),
                reviewNotes: notes ? String(notes).trim() : null
            }
        });

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.ADMIN_ACCESS_REQUEST_APPROVED,
            targetType: "AdminAccessRequest",
            targetId: id,
            description: `Approved access request for '${request.email}' with role '${roleRow.displayName}'`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: `Access approved. ${request.email} can now sign in with Google.`,
            admin: { id: admin.id, email: admin.email, role: admin.role }
        });
    } catch (error: any) {
        console.error("APPROVE ACCESS REQUEST ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Reject Access Request (Super Admin) ──────────────────────────────────────

export const rejectAccessRequest = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { notes } = req.body;

        const request = await prisma.adminAccessRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ message: "Access request not found." });

        await prisma.adminAccessRequest.update({
            where: { id },
            data: {
                status: AccessRequestStatus.REJECTED,
                reviewedById: caller.id,
                reviewedAt: new Date(),
                reviewNotes: notes ? String(notes).trim() : null
            }
        });

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.ADMIN_ACCESS_REQUEST_REJECTED,
            targetType: "AdminAccessRequest",
            targetId: id,
            description: `Rejected access request for '${request.email}'`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ message: `Access request for ${request.email} rejected.` });
    } catch (error: any) {
        console.error("REJECT ACCESS REQUEST ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Create Admin (Direct) ───────────────────────────────────────────────────

export const createAdmin = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const allowed = caller.isSuperAdmin || (await hasPermission(caller.id, "admin.users.manage"));
        if (!allowed) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const { name, email, password, role, roleId } = req.body;
        if (!name || !email || !(role || roleId)) {
            return res.status(400).json({ message: "Name, email, and role are required." });
        }

        const normalizedEmail = (email as string).trim().toLowerCase();
        const existing = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
        if (existing) {
            return res.status(409).json({ message: "Admin account with this email already exists." });
        }

        let roleRow = null;
        if (roleId) {
            roleRow = await prisma.adminRole.findUnique({ where: { id: String(roleId) } });
        } else if (role) {
            roleRow = await prisma.adminRole.findUnique({ where: { name: String(role).toUpperCase() } });
        }
        if (!roleRow) {
            return res.status(400).json({ message: "Unknown role." });
        }

        const isSuper = TOP_ROLES.includes(roleRow.name);
        if (isSuper && !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        let passwordHash: string | null = null;
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: "Password must be at least 6 characters." });
            }
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        const parts = (name as string).trim().split(/\s+/);
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";

        const admin = await prisma.admin.create({
            data: {
                email: normalizedEmail,
                passwordHash,
                firstName,
                lastName,
                isSuperAdmin: isSuper,
                role: roleRow.name,
                roleId: roleRow.id,
                isActive: true,
                status: AdminAccountStatus.ACTIVE,
                authProvider: "EMAIL"
            }
        });

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.ADMIN_CREATED,
            targetType: "Admin",
            targetId: admin.id,
            description: `Admin account '${admin.email}' created with role ${roleRow.name}`,
            previousValue: null,
            newValue: { email: admin.email, role: roleRow.name, roleId: roleRow.id },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({
            message: "Admin account created successfully.",
            admin: {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                isSuperAdmin: admin.isSuperAdmin,
                role: admin.role,
                roleId: admin.roleId,
                roleName: roleRow.name,
                status: admin.status
            }
        });
    } catch (error: any) {
        console.error("CREATE ADMIN ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Update Admin Status (Super Admin only) ───────────────────────────────────

export const updateAdminStatus = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { isActive, status } = req.body;

        const target = await prisma.admin.findUnique({ where: { id } });
        if (!target) {
            return res.status(404).json({ message: "Admin account not found." });
        }

        let newStatus: AdminAccountStatus = target.status;
        let newIsActive: boolean = target.isActive;

        if (status) {
            newStatus = status as AdminAccountStatus;
            newIsActive = newStatus === AdminAccountStatus.ACTIVE;
        } else if (isActive !== undefined) {
            newIsActive = Boolean(isActive);
            newStatus = newIsActive ? AdminAccountStatus.ACTIVE : AdminAccountStatus.DISABLED;
        }

        // Protect last active Super Admin
        if (!newIsActive && target.isSuperAdmin) {
            const activeSuperAdmins = await prisma.admin.count({
                where: { isSuperAdmin: true, isActive: true }
            });
            if (activeSuperAdmins <= 1 && target.isActive) {
                return res.status(400).json({ message: "Cannot disable or suspend the last active Super Admin." });
            }
        }

        const admin = await prisma.admin.update({
            where: { id },
            data: { isActive: newIsActive, status: newStatus }
        });

        invalidatePermissionCache(id);

        // If suspended or disabled, terminate active sessions immediately
        if (!newIsActive) {
            await prisma.refreshToken.updateMany({
                where: { userId: id, userType: "ADMIN", revoked: false },
                data: { revoked: true }
            });
            disconnectActorSockets(id, "Account deactivated or suspended by Super Admin", "ADMIN");
        }

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.ADMIN_STATUS_CHANGED,
            targetType: "Admin",
            targetId: id,
            description: `Admin status changed to ${newStatus} (${newIsActive ? "active" : "inactive"})`,
            previousValue: { isActive: target.isActive, status: target.status },
            newValue: { isActive: admin.isActive, status: admin.status },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: `Admin status updated to ${newStatus}.`,
            admin: { id: admin.id, isActive: admin.isActive, status: admin.status }
        });
    } catch (error: any) {
        console.error("UPDATE ADMIN STATUS ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Revoke Admin Sessions (Super Admin only) ─────────────────────────────────

export const revokeAdminSessions = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const target = await prisma.admin.findUnique({ where: { id } });
        if (!target) return res.status(404).json({ message: "Admin account not found." });

        await prisma.refreshToken.updateMany({
            where: { userId: id, userType: "ADMIN", revoked: false },
            data: { revoked: true }
        });

        disconnectActorSockets(id, "Sessions revoked by Super Admin", "ADMIN");
        invalidatePermissionCache(id);

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.SESSION_REVOKED,
            targetType: "Admin",
            targetId: id,
            description: `Revoked all active sessions for administrator '${target.email}'`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ message: `All active sessions revoked for ${target.email}.` });
    } catch (error: any) {
        console.error("REVOKE SESSIONS ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Update Admin Role (Super Admin only) ────────────────────────────────────

export const updateAdminRole = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { role, roleId } = req.body;

        if (!role && !roleId) {
            return res.status(400).json({ message: "Role is required." });
        }

        const target = await prisma.admin.findUnique({ where: { id } });
        if (!target) {
            return res.status(404).json({ message: "Admin account not found." });
        }

        let roleRow = null;
        if (roleId) {
            roleRow = await prisma.adminRole.findUnique({ where: { id: String(roleId) } });
        } else if (role) {
            roleRow = await prisma.adminRole.findUnique({ where: { name: String(role).toUpperCase() } });
        }
        if (!roleRow) {
            return res.status(400).json({ message: "Unknown role." });
        }

        const isSuper = TOP_ROLES.includes(roleRow.name);

        if (!isSuper && target.isSuperAdmin && target.isActive) {
            const activeSuperAdmins = await prisma.admin.count({
                where: { isSuperAdmin: true, isActive: true }
            });
            if (activeSuperAdmins <= 1) {
                return res.status(400).json({ message: "At least one active Super Admin must remain." });
            }
        }

        const admin = await prisma.admin.update({
            where: { id },
            data: { role: roleRow.name, roleId: roleRow.id, isSuperAdmin: isSuper }
        });

        invalidatePermissionCache(target.id);

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.ROLE_UPDATED,
            targetType: "Admin",
            targetId: id,
            description: `Role changed to ${roleRow.name}`,
            previousValue: { role: target.role },
            newValue: { role: roleRow.name },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: "Admin role updated successfully.",
            admin: {
                id: admin.id,
                role: admin.role,
                roleId: admin.roleId,
                roleName: roleRow.name,
                isSuperAdmin: admin.isSuperAdmin
            }
        });
    } catch (error: any) {
        console.error("UPDATE ADMIN ROLE ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Reset Admin Password (Super Admin only) ──────────────────────────────────

export const resetAdminPassword = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }

        const target = await prisma.admin.findUnique({ where: { id } });
        if (!target) {
            return res.status(404).json({ message: "Admin account not found." });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newAuthProvider =
            target.authProvider === "GOOGLE" ? "EMAIL_AND_GOOGLE" : target.authProvider;

        await prisma.admin.update({
            where: { id },
            data: { passwordHash, authProvider: newAuthProvider }
        });

        await logAdminAction({
            adminId: caller.id,
            actionType: AdminActionType.ADMIN_PASSWORD_CHANGED,
            targetType: "Admin",
            targetId: id,
            description: `Password reset by Super Admin for '${target.email}'`,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ message: "Admin password reset successfully." });
    } catch (error: any) {
        console.error("RESET ADMIN PASSWORD ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Get Admin Audit Logs ─────────────────────────────────────────────────────

export const getAdminAuditLogs = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || (!caller.isSuperAdmin && !(await hasPermission(caller.id, "audit_logs.view")))) {
            return res.status(403).json({ message: "Forbidden: Audit log permission required." });
        }

        const targetAdminId = req.query.adminId as string | undefined;

        const logs = await prisma.adminAction.findMany({
            where: targetAdminId
                ? { OR: [{ adminId: targetAdminId }, { targetId: targetAdminId, targetType: "Admin" }] }
                : undefined,
            orderBy: { performedAt: "desc" },
            take: 100,
            include: {
                admin: { select: { firstName: true, lastName: true, email: true } }
            }
        });

        return res.status(200).json({ logs });
    } catch (error: any) {
        console.error("GET AUDIT LOGS ERROR:", error);
        return res.status(500).json({ message: getSafeErrorMessage(error) });
    }
};

// ─── Forgot Password (self-service) ───────────────────────────────────────────

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });

        if (!admin || !admin.isActive) {
            return res.status(200).json({
                message: "If an account exists for this email, a password reset link has been sent.",
            });
        }

        if (!admin.passwordHash) {
            return res.status(200).json({
                message: "If an account exists for this email, a password reset link has been sent.",
            });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await bcrypt.hash(code, 10);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await prisma.otp.create({
            data: {
                entityType: "ADMIN",
                entityId: admin.id,
                email: admin.email,
                codeHash,
                purpose: "PASSWORD_RESET",
                expiresAt,
            }
        });

        const adminFrontendUrl = (process.env.ADMIN_FRONTEND_URL || "http://localhost:8001").replace(/\/$/, "");
        const resetLink = `${adminFrontendUrl}/forgot-password?otp=${code}&email=${encodeURIComponent(admin.email)}`;

        await EmailService.sendForgotPassword(admin.email, code, {
            firstName: admin.firstName,
            resetUrl: resetLink,
        });

        return res.status(200).json({
            message: "If an account exists for this email, a password reset link has been sent.",
        });
    } catch (error: any) {
        console.error("ADMIN FORGOT PASSWORD ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ─── Verify OTP ───────────────────────────────────────────────────────────────

export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
        if (!admin) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const otpRecord = await prisma.otp.findFirst({
            where: {
                email: admin.email,
                purpose: "PASSWORD_RESET",
                expiresAt: { gt: new Date() },
                usedAt: null,
            },
            orderBy: { createdAt: "desc" }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: "OTP expired or not found. Please request a new one." });
        }

        if (otpRecord.attempts >= otpRecord.maxAttempts) {
            return res.status(400).json({ message: "Max attempts exceeded. Please request a new OTP." });
        }

        const isMatch = await bcrypt.compare(otp, otpRecord.codeHash);
        if (!isMatch) {
            await prisma.otp.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } }
            });
            return res.status(400).json({ message: "Invalid OTP code. Please try again." });
        }

        await prisma.otp.update({
            where: { id: otpRecord.id },
            data: { usedAt: new Date() }
        });

        const resetToken = jwt.sign(
            { adminId: admin.id, purpose: "reset-password" },
            process.env.JWT_SECRET_KEY!,
            { expiresIn: "10m" }
        );

        return res.status(200).json({ message: "OTP verified successfully.", resetToken });
    } catch (error: any) {
        console.error("ADMIN VERIFY OTP ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ─── Reset Password (with reset token) ────────────────────────────────────────

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({ message: "Token and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        let decoded: any;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET_KEY!);
        } catch {
            return res.status(400).json({ message: "Invalid or expired password reset token." });
        }

        if (!decoded || decoded.purpose !== "reset-password" || !decoded.adminId) {
            return res.status(400).json({ message: "Invalid reset token payload." });
        }

        const admin = await prisma.admin.findUnique({ where: { id: decoded.adminId } });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        const newAuthProvider =
            admin.authProvider === "GOOGLE" ? "EMAIL_AND_GOOGLE" : admin.authProvider;

        await prisma.admin.update({
            where: { id: admin.id },
            data: { passwordHash, authProvider: newAuthProvider }
        });

        await logAdminAction({
            adminId: admin.id,
            actionType: AdminActionType.ADMIN_PASSWORD_CHANGED,
            targetType: "Admin",
            targetId: admin.id,
            description: "Self-service password reset completed via OTP",
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            message: "Password updated successfully. Please log in with your new password."
        });
    } catch (error: any) {
        console.error("ADMIN RESET PASSWORD ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
