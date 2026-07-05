import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../../config/token.js";
import { setAuthCookie, clearAuthCookie, setRefreshCookie, clearRefreshCookie } from "../../../config/sessionCookies.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const admin = await prisma.admin.findUnique({ where: { email } });

        if (!admin || !admin.isActive) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (!admin.passwordHash) {
            return res.status(401).json({ message: "This account uses Google sign-in. Please sign in with Google." });
        }

        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = signAccessToken(admin.id);
        setAuthCookie(res, "admin_session", accessToken);

        const refreshToken = signRefreshToken(admin.id);
        const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

        await prisma.refreshToken.create({
            data: { userId: admin.id, userType: "ADMIN", tokenHash: refreshHash, expiresAt }
        });

        setRefreshCookie(res, refreshToken);

        await prisma.admin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() }
        });

        return res.status(200).json({
            message: "Login successful",
            admin: {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                isSuperAdmin: admin.isSuperAdmin,
                role: admin.role
            }
        });
    } catch (error: any) {
        console.error("ADMIN LOGIN ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
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
        }
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error: any) {
        console.error("ADMIN LOGOUT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refresh = async (req: Request, res: Response) => {
    try {
        const rawToken = req.cookies?.admin_refresh || req.headers["x-refresh-token"];
        const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
        if (!token) return res.status(401).json({ message: "No refresh token" });

        let payload: any;
        try {
            payload = verifyRefreshToken(token) as any;
        } catch (err) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        const userId = payload.id as string;
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const stored = await prisma.refreshToken.findFirst({
            where: { tokenHash, userId, userType: "ADMIN", revoked: false, expiresAt: { gt: new Date() } }
        });
        if (!stored) return res.status(401).json({ message: "Refresh token invalid or revoked" });

        await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

        const newRefresh = signRefreshToken(userId);
        const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        await prisma.refreshToken.create({ data: { userId, userType: "ADMIN", tokenHash: newHash, expiresAt } });

        const accessToken = signAccessToken(userId);
        setAuthCookie(res, "admin_session", accessToken);
        setRefreshCookie(res, newRefresh);

        return res.status(200).json({ message: "Refreshed" });
    } catch (err) {
        console.error("REFRESH ERROR", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ─── Setup Status ─────────────────────────────────────────────────────────────

export const getSetupStatus = async (req: Request, res: Response) => {
    try {
        const count = await prisma.admin.count();
        return res.status(200).json({ initialized: count > 0 });
    } catch (error: any) {
        console.error("GET SETUP STATUS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── First Admin Setup ────────────────────────────────────────────────────────

export const setupFirstAdmin = async (req: Request, res: Response) => {
    try {
        const count = await prisma.admin.count();
        if (count > 0) {
            return res.status(403).json({ message: "Admin already initialized." });
        }

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "";

        const newAdmin = await prisma.admin.create({
            data: {
                email: email.trim().toLowerCase(),
                passwordHash,
                firstName,
                lastName,
                isSuperAdmin: true,
                role: "SUPER_ADMIN",
                isActive: true,
                authProvider: "EMAIL"
            }
        });

        return res.status(201).json({
            message: "Super Admin created successfully",
            admin: {
                id: newAdmin.id,
                email: newAdmin.email,
                firstName: newAdmin.firstName,
                lastName: newAdmin.lastName,
                isSuperAdmin: newAdmin.isSuperAdmin,
                role: newAdmin.role
            }
        });
    } catch (error: any) {
        console.error("SETUP FIRST ADMIN ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
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
                isSuperAdmin: true,
                isActive: true,
                role: true,
                authProvider: true,
                lastLoginAt: true,
                createdAt: true
            }
        });

        if (!admin) {
            return res.status(404).json({ message: "Admin profile not found" });
        }

        return res.status(200).json({ admin });
    } catch (error: any) {
        console.error("ADMIN GET PROFILE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Update Profile ───────────────────────────────────────────────────────────

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { name, firstName: bodyFirstName, lastName: bodyLastName, phone, avatarUrl } = req.body;

        let firstName: string | undefined = bodyFirstName;
        let lastName: string | undefined = bodyLastName;

        if (name !== undefined) {
            const nameParts = (name as string).trim().split(/\s+/);
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
        }

        const updatedAdmin = await prisma.admin.update({
            where: { id: adminId },
            data: {
                ...(firstName !== undefined ? { firstName } : {}),
                ...(lastName !== undefined ? { lastName } : {}),
                ...(phone !== undefined ? { phone } : {}),
                ...(avatarUrl !== undefined ? { avatarUrl } : {})
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                isSuperAdmin: true,
                isActive: true,
                role: true,
                authProvider: true,
                updatedAt: true
            }
        });

        return res.status(200).json({
            message: "Profile updated successfully",
            admin: updatedAdmin
        });
    } catch (error: any) {
        console.error("ADMIN UPDATE PROFILE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Update Password ──────────────────────────────────────────────────────────

export const updatePassword = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
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
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        const newAuthProvider =
            admin.authProvider === "GOOGLE" ? "EMAIL_AND_GOOGLE" : admin.authProvider;

        await prisma.admin.update({
            where: { id: adminId },
            data: { passwordHash, authProvider: newAuthProvider }
        });

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error: any) {
        console.error("ADMIN UPDATE PASSWORD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Google OAuth ─────────────────────────────────────────────────────────────

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

            email = payload.email;
            googleId = payload.sub;
            firstName = payload.given_name ?? "";
            lastName = payload.family_name ?? "";
            avatarUrl = payload.picture ?? "";
        } else if (bodyEmail) {
            email = bodyEmail as string;
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
            return res.status(400).json({ message: "Google token or user info is required" });
        }

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const count = await prisma.admin.count();
        let admin = await prisma.admin.findUnique({ where: { email } });

        if (count === 0) {
            admin = await prisma.admin.create({
                data: {
                    email,
                    firstName: firstName || "Admin",
                    lastName: lastName || "",
                    avatarUrl,
                    googleId,
                    authProvider: "GOOGLE",
                    isSuperAdmin: true,
                    role: "SUPER_ADMIN",
                    isActive: true
                }
            });
        } else {
            if (!admin) {
                return res.status(404).json({ message: "No admin account found with this email. Please contact your Super Admin." });
            }
            if (!admin.isActive) {
                return res.status(403).json({ message: "Admin account is deactivated" });
            }

            const newAuthProvider =
                admin.authProvider === "EMAIL" ? "EMAIL_AND_GOOGLE" : admin.authProvider;

            admin = await prisma.admin.update({
                where: { id: admin.id },
                data: {
                    googleId: googleId || admin.googleId,
                    authProvider: newAuthProvider,
                    avatarUrl: avatarUrl || admin.avatarUrl
                }
            });
        }

        const accessToken = signAccessToken(admin.id);
        setAuthCookie(res, "admin_session", accessToken);

        return res.status(200).json({
            message: "Google login successful",
            admin: {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                isSuperAdmin: admin.isSuperAdmin,
                role: admin.role
            }
        });
    } catch (error: any) {
        console.error("ADMIN GOOGLE OAUTH ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── List Admins (Super Admin only) ──────────────────────────────────────────

export const listAdmins = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const admins = await prisma.admin.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                isActive: true,
                isSuperAdmin: true,
                role: true,
                lastLoginAt: true,
                createdAt: true,
                authProvider: true
            }
        });

        return res.status(200).json({ admins });
    } catch (error: any) {
        console.error("LIST ADMINS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Create Admin (Super Admin only) ─────────────────────────────────────────

export const createAdmin = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const { name, email, password, role } = req.body;
        if (!name || !email || !role) {
            return res.status(400).json({ message: "Name, email, and role are required." });
        }

        const existing = await prisma.admin.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ message: "Admin account with this email already exists." });
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
        const isSuper = role === "SUPER_ADMIN";

        const admin = await prisma.admin.create({
            data: {
                email: (email as string).trim().toLowerCase(),
                passwordHash,
                firstName,
                lastName,
                isSuperAdmin: isSuper,
                role,
                isActive: true,
                authProvider: "EMAIL"
            }
        });

        return res.status(201).json({
            message: "Admin account created successfully.",
            admin: {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                isSuperAdmin: admin.isSuperAdmin,
                role: admin.role
            }
        });
    } catch (error: any) {
        console.error("CREATE ADMIN ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Update Admin Status (Super Admin only) ───────────────────────────────────

export const updateAdminStatus = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = req.params.id as string;
        const { isActive } = req.body;

        if (isActive === undefined) {
            return res.status(400).json({ message: "isActive status is required." });
        }

        const target = await prisma.admin.findUnique({ where: { id } });
        if (!target) {
            return res.status(404).json({ message: "Admin account not found." });
        }

        if (!isActive && target.isSuperAdmin) {
            const activeSuperAdmins = await prisma.admin.count({
                where: { isSuperAdmin: true, isActive: true }
            });
            if (activeSuperAdmins <= 1 && target.isActive) {
                return res.status(400).json({ message: "At least one active Super Admin must remain." });
            }
        }

        const admin = await prisma.admin.update({
            where: { id },
            data: { isActive }
        });

        return res.status(200).json({
            message: `Admin status updated to ${isActive ? "active" : "disabled"}.`,
            admin: { id: admin.id, isActive: admin.isActive }
        });
    } catch (error: any) {
        console.error("UPDATE ADMIN STATUS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Update Admin Role (Super Admin only) ────────────────────────────────────

export const updateAdminRole = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = req.params.id as string;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ message: "Role is required." });
        }

        const target = await prisma.admin.findUnique({ where: { id } });
        if (!target) {
            return res.status(404).json({ message: "Admin account not found." });
        }

        const isSuper = role === "SUPER_ADMIN";

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
            data: { role, isSuperAdmin: isSuper }
        });

        return res.status(200).json({
            message: "Admin role updated successfully.",
            admin: { id: admin.id, role: admin.role, isSuperAdmin: admin.isSuperAdmin }
        });
    } catch (error: any) {
        console.error("UPDATE ADMIN ROLE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Reset Admin Password (Super Admin only) ──────────────────────────────────

export const resetAdminPassword = async (req: Request, res: Response) => {
    try {
        const caller = await prisma.admin.findUnique({ where: { id: req.adminId } });
        if (!caller || !caller.isSuperAdmin) {
            return res.status(403).json({ message: "Forbidden: Super Admin access required." });
        }

        const id = req.params.id as string;
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

        return res.status(200).json({ message: "Admin password reset successfully." });
    } catch (error: any) {
        console.error("RESET ADMIN PASSWORD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
