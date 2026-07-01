import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../../config/token.js";
import { adminsessionCookie } from "../../../config/sessionCookies.js";

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const admin = await prisma.admin.findUnique({
            where: { email }
        });

        if (!admin || !admin.isActive) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate access token and short-lived cookie
        const accessToken = signAccessToken(admin.id);
        const cookie = adminsessionCookie();
        // set access cookie with short expiry (15 minutes)
        res.cookie(cookie.name, accessToken, { ...cookie.options, maxAge: 1000 * 60 * 15 });

        // Generate refresh token, store hashed, and set httpOnly refresh cookie
        const refreshToken = signRefreshToken(admin.id);
        const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
        await prisma.refreshToken.create({ data: { userId: admin.id, userType: 'ADMIN', tokenHash: refreshHash, expiresAt } });
        res.cookie('admin_refresh', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 1000 * 60 * 60 * 24 * 30 });

        // Update last login
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
                isSuperAdmin: admin.isSuperAdmin
            }
        });
    } catch (error: any) {
        console.error("ADMIN LOGIN ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const cookie = adminsessionCookie();
        res.clearCookie(cookie.name, {
            httpOnly: cookie.options.httpOnly,
            secure: cookie.options.secure,
            sameSite: cookie.options.sameSite
        });
        // Clear refresh cookie and revoke refresh tokens for this admin if available
        res.clearCookie('admin_refresh', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
        if (req.adminId) {
            await prisma.refreshToken.updateMany({ where: { userId: req.adminId, userType: 'ADMIN', revoked: false }, data: { revoked: true } });
        }
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error: any) {
        console.error("ADMIN LOGOUT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.admin_refresh || req.headers['x-refresh-token'];
        if (!token) return res.status(401).json({ message: 'No refresh token' });

        // verify JWT signature
        let payload: any;
        try {
            payload = verifyRefreshToken(token) as any;
        } catch (err) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        const userId = payload.id as string;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const stored = await prisma.refreshToken.findFirst({ where: { tokenHash, userId, userType: 'ADMIN', revoked: false, expiresAt: { gt: new Date() } } });
        if (!stored) return res.status(401).json({ message: 'Refresh token invalid or revoked' });

        // Rotate refresh token: revoke old and create new
        await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
        const newRefresh = signRefreshToken(userId);
        const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        await prisma.refreshToken.create({ data: { userId, userType: 'ADMIN', tokenHash: newHash, expiresAt } });

        const accessToken = signAccessToken(userId);
        const cookie = adminsessionCookie();
        res.cookie(cookie.name, accessToken, { ...cookie.options, maxAge: 1000 * 60 * 15 });
        res.cookie('admin_refresh', newRefresh, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 1000 * 60 * 60 * 24 * 30 });

        return res.status(200).json({ message: 'Refreshed' });
    } catch (err) {
        console.error('REFRESH ERROR', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

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

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { firstName, lastName, phone, avatarUrl } = req.body;

        const updatedAdmin = await prisma.admin.update({
            where: { id: adminId },
            data: {
                firstName,
                lastName,
                phone,
                avatarUrl
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                isSuperAdmin: true,
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

export const changePassword = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId;
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Old password and new password are required" });
        }

        const admin = await prisma.admin.findUnique({
            where: { id: adminId }
        });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const isMatch = await bcrypt.compare(oldPassword, admin.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect old password" });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await prisma.admin.update({
            where: { id: adminId },
            data: { passwordHash }
        });

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error: any) {
        console.error("ADMIN CHANGE PASSWORD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
