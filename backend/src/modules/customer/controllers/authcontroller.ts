import type { Request, Response } from 'express';
import { prisma } from '../../../config/prisma.js'
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { signAccessToken } from '../../../config/token.js'
import { setAuthCookie, clearAuthCookie, customersessionCookie } from '../../../config/sessionCookies.js'
import { AuthProvider } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import EmailService from '../../../services/email/email.service.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);




export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password, firstName, lastName } = req.body;

        const missingFields: string[] = [];
        if (!username?.trim()) missingFields.push('username');
        if (!email?.trim()) missingFields.push('email');
        if (!password) missingFields.push('password');
        if (!firstName?.trim()) missingFields.push('firstName');

        if (missingFields.length > 0) {
            console.warn('[REGISTER] Validation failed - missing fields:', missingFields);
            return res.status(400).json({
                message: `Missing required fields: ${missingFields.join(', ')}`,
                fields: missingFields,
            });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const existingUser = await prisma.customer.findFirst({
            where: { OR: [{ email }, { username }] }
        });

        if (existingUser) {
            const conflictField = existingUser.email === email ? 'email' : 'username';
            return res.status(409).json({
                message: `A customer with this ${conflictField} already exists`,
                field: conflictField,
            });
        }

        const existingSeller = await prisma.seller.findFirst({
            where: { OR: [{ email }, { username }] }
        });

        if (existingSeller) {
            return res.status(409).json({
                message: 'A seller account already exists with this email or username',
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

                const newuser = await prisma.customer.create({
            data: {
                firstName: firstName.trim(),
                lastName: lastName?.trim() || null,
                username: username.trim(),
                email: email.trim().toLowerCase(),
                passwordHash: hashedPassword,
                authProvider: AuthProvider.EMAIL,
            }
        });

        const customerFrontendUrl = (process.env.CUSTOMER_FRONTEND_URL || '').replace(/\/$/, '');
        try {
            await EmailService.sendVerificationEmail(newuser.email, {
                firstName,
                verificationUrl: `${customerFrontendUrl}/verify-email?email=${encodeURIComponent(newuser.email)}`
            });
        } catch (emailErr) {
            console.warn('[REGISTER] Verification email failed (non-blocking):', emailErr);
        }
        try {
            await EmailService.sendWelcomeEmail(newuser.email, {
                firstName,
                loginUrl: `${customerFrontendUrl}/login`
            });
        } catch (emailErr) {
            console.warn('[REGISTER] Welcome email failed (non-blocking):', emailErr);
        }

        const token = signAccessToken(newuser.id);
        setAuthCookie(res, 'customer_session', token);

        return res.status(201).json({
            message: 'Registration successful',
            user: {
                id: newuser.id,
                email: newuser.email,
                username: newuser.username,
                fullname: `${newuser.firstName} ${newuser.lastName ?? ''}`.trim(),
            }
        });
    } catch (error: any) {
        console.error('[REGISTER] Unhandled error:', {
            message: error?.message,
            code: error?.code,
            meta: error?.meta,
            stack: error?.stack,
        });

        if (error?.code === 'P2002') {
            const target = error?.meta?.target as string[] | undefined;
            const field = target?.[0] || 'field';
            return res.status(409).json({
                message: `A user with this ${field} already exists`,
                field,
            });
        }

        return res.status(500).json({ message: 'Internal server error during registration' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const loginIdentifier = req.body.identifier;
        const { password } = req.body;

        if (!loginIdentifier || !password) {
            return res.status(400).json({ message: 'Identifier and password are required' });
        }

        // Check if user exists by email or username
        const customer = await prisma.customer.findFirst({
            where: {
                OR: [
                    { email: loginIdentifier },
                    { username: loginIdentifier }
                ]
            }
        });

        if (!customer) {
            // Check if seller exists with this email or username
            const existingSeller = await prisma.seller.findFirst({
                where: {
                    OR: [
                        { email: loginIdentifier },
                        { username: loginIdentifier }
                    ]
                }
            });
            if (existingSeller) {
                return res.status(400).json({
                    message: "This account is registered under the Seller Portal. Please log in through the Seller Portal."
                });
            }
            return res.status(404).json({ message: 'User not found' });
        }

        if (customer.isBanned) {
            return res.status(403).json({
                message: "Account is banned"
            });
        }

        if (!customer.passwordHash) {
            return res.status(401).json({
                message: 'This account uses Google sign-in. Please sign in with Google.'
            });
        }

        // Check if the password is correct
        const isMatch = await bcrypt.compare(password, customer.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = signAccessToken(customer.id);

        setAuthCookie(res, 'customer_session', token);

        return res.status(200).json({
            message: "Login successful",
            user: {
                id: customer.id,
                email: customer.email,
                username: customer.username,
                firstName: customer.firstName,
                lastName: customer.lastName
            }
        });
    } catch (error) {
        console.error('CUSTOMER LOGIN ERROR:', {
            route: req.originalUrl,
            method: req.method,
            payload: { ...req.body, password: req.body?.password ? '[redacted]' : undefined },
            error
        });
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { identifier } = req.body;

        if (!identifier) {
            return res.status(400).json({ message: 'Identifier is required' });
        }

        const customer = await prisma.customer.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        });

        if (!customer) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!customer.passwordHash) {
            return res.status(400).json({
                message: 'This account uses Google sign-in. Please sign in with Google.'
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(resetToken, 10);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await prisma.otp.create({
            data: {
                entityType: 'CUSTOMER',
                entityId: customer.id,
                email: customer.email,
                codeHash: tokenHash,
                purpose: 'PASSWORD_RESET',
                expiresAt,
            }
        });

        const customerFrontendUrl = process.env.CUSTOMER_FRONTEND_URL!.replace(/\/$/, '');
        const resetUrl = `${customerFrontendUrl}/forgot-password?token=${encodeURIComponent(resetToken)}&identifier=${encodeURIComponent(customer.email)}`;
        const emailResult = await EmailService.sendForgotPassword(customer.email, resetToken, {
            firstName: customer.firstName as string,
            resetUrl,
        });

        if (!emailResult.success) {
            console.warn('[CUSTOMER FORGOT PASSWORD] Reset token generated but email delivery failed', {
                customerId: customer.id,
                email: customer.email,
                error: emailResult.error
            });
        }

        return res.status(200).json({
            message: emailResult.success
                ? 'Password reset instructions have been sent.'
                : 'Password reset token was generated but email delivery failed. Please contact support.',
            email: customer.email,
            emailDelivery: emailResult.success ? 'sent' : 'failed',
        });
    } catch (error) {
        console.error('CUSTOMER FORGOT PASSWORD ERROR:', {
            route: req.originalUrl,
            method: req.method,
            payload: req.body,
            error
        });
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { identifier, resetToken, newPassword } = req.body;

        if (!identifier || !resetToken || !newPassword) {
            return res.status(400).json({ message: 'Identifier, reset token, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const customer = await prisma.customer.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        });

        if (!customer) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetRecord = await prisma.otp.findFirst({
            where: {
                entityType: 'CUSTOMER',
                entityId: customer.id,
                email: customer.email,
                purpose: 'PASSWORD_RESET',
                expiresAt: { gt: new Date() },
                usedAt: null
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!resetRecord) {
            return res.status(400).json({ message: 'Reset token is invalid or expired' });
        }

        const isTokenValid = await bcrypt.compare(resetToken, resetRecord.codeHash);
        if (!isTokenValid) {
            await prisma.otp.update({
                where: { id: resetRecord.id },
                data: { attempts: { increment: 1 } }
            });
            return res.status(400).json({ message: 'Reset token is invalid or expired' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await prisma.$transaction([
            prisma.customer.update({
                where: { id: customer.id },
                data: {
                    passwordHash,
                    authProvider: customer.authProvider === AuthProvider.GOOGLE ? AuthProvider.EMAIL_AND_GOOGLE : customer.authProvider
                }
            }),
            prisma.otp.update({
                where: { id: resetRecord.id },
                data: { usedAt: new Date() }
            })
        ]);

        return res.status(200).json({
            message: 'Password updated successfully. Please log in with your new password.'
        });
    } catch (error) {
        console.error('CUSTOMER RESET PASSWORD ERROR:', {
            route: req.originalUrl,
            method: req.method,
            payload: { ...req.body, newPassword: req.body?.newPassword ? '[redacted]' : undefined },
            error
        });
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};



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
            provider,
            providerId,
            googleId: bodyGoogleId,
        } = req.body;

        if (idToken) {
            const audience = process.env.GOOGLE_CLIENT_ID;
            if (!audience) {
                return res.status(500).json({
                    message: "Google client ID is not configured"
                });
            }

            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience
            });

            const payload = ticket.getPayload();

            if (!payload || !payload.email) {
                return res.status(401).json({
                    message: "Invalid Google token"
                });
            }

            email = payload.email;
            googleId = payload.sub;
            firstName = payload.given_name ?? "";
            lastName = payload.family_name ?? "";
            avatarUrl = payload.picture ?? "";
        } else if (bodyEmail) {
            email = bodyEmail;
            googleId = providerId || bodyGoogleId || `google_${bodyEmail}`;
            firstName = bodyFirstName || "";
            lastName = bodyLastName || "";
            avatarUrl = bodyAvatarUrl || "";
            if (bodyName) {
                const nameParts = bodyName.trim().split(/\s+/);
                firstName = firstName || nameParts[0] || "";
                lastName = lastName || nameParts.slice(1).join(" ") || "";
            }
        } else {
            return res.status(400).json({
                message: "Google token or user info is required"
            });
        }

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const existingSeller = await prisma.seller.findUnique({
            where: {
                email
            }
        });

        if (existingSeller) {
            return res.status(400).json({
                message: "This account is registered under the Seller Portal. Please log in through the Seller Portal."
            });
        }

        let customer = await prisma.customer.findUnique({
            where: {
                email
            }
        });

        if (customer) {
            customer = await prisma.customer.update({
                where: {
                    id: customer.id
                },
                data: {
                    googleId: googleId || customer.googleId,
                    emailVerified: true,
                    authProvider: provider === 'google' ? AuthProvider.GOOGLE : customer.authProvider,
                    firstName: firstName || customer.firstName,
                    lastName: lastName || customer.lastName,
                    avatarUrl: avatarUrl || customer.avatarUrl
                }
            });

            if (customer.isBanned) {
                return res.status(403).json({
                    message: "Account is banned"
                });
            }

            const token = signAccessToken(customer.id);

            setAuthCookie(res, 'customer_session', token);

            return res.status(200).json({
                message: "Google login successful",
                user: {
                    id: customer.id,
                    email: customer.email,
                    username: customer.username,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    avatarUrl: customer.avatarUrl
                }
            });
        }

        const usernameBase = email.split("@")[0];

        if (!usernameBase) {
            return res.status(400).json({
                message: "Invalid email"
            });
        }

        let baseUser = usernameBase.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (!baseUser) {
            baseUser = 'user';
        }

        let isUnique = false;
        let suffix = 0;
        let finalUsername = baseUser;
        while (!isUnique) {
            const checkUsername = suffix === 0 ? baseUser : `${baseUser}${suffix}`;
            const existing = await prisma.customer.findUnique({
                where: { username: checkUsername }
            });
            const existingInSeller = await prisma.seller.findUnique({
                where: { username: checkUsername }
            });
            if (!existing && !existingInSeller) {
                finalUsername = checkUsername;
                isUnique = true;
            } else {
                suffix += Math.floor(Math.random() * 10) + 1;
            }
        }
        let username = finalUsername;

        customer = await prisma.customer.create({
            data: {
                email,
                username,
                googleId: googleId || `google_${email}`,
                authProvider: AuthProvider.GOOGLE,
                firstName: firstName || username,
                lastName,
                avatarUrl,
                emailVerified: true
            }
        });

        if (customer.isBanned) {
            return res.status(403).json({
                message: "Account is banned"
            });
        }

        const token = signAccessToken(customer.id);

        setAuthCookie(res, 'customer_session', token);

        return res.status(201).json({
            message: "Google account created successfully",
            user: {
                id: customer.id,
                email: customer.email,
                username: customer.username,
                firstName: customer.firstName,
                lastName: customer.lastName,
                avatarUrl: customer.avatarUrl
            }
        });

    } catch (error) {
        console.error("GOOGLE AUTH ERROR:", error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};



export const logout = async (req: Request, res: Response) => {

    clearAuthCookie(res, 'customer_session');

    return res.status(200).json({
        message: "Logged out successfully"
    });
};



export const getProfile = async (req: Request, res: Response) => {
    const customerId = req.customerId!;
    const customer = await prisma.customer.findUnique({
        where: {
            id: customerId
        }, include: {
            addresses: true
        }

    });
    if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
    }
    return res.status(200).json({
        message: "Profile fetched successfully",
        user: {
            id: customer.id,
            email: customer.email,
            username: customer.username,
            firstName: customer.firstName,
            lastName: customer.lastName,
            addresses: customer.addresses
        }
    });
}



export const updateProfile = async (req: Request, res: Response) => {
    try {

        const { phone, type, label, fullName, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = req.body;

        const customerId = req.customerId!;

        const customer = await prisma.customer.findUnique({
            where: {
                id: customerId
            }, include: {
                addresses: true
            }
        });

        if (!customer) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        // Update customer phone
        const updatedCustomer = await prisma.customer.update({
            where: {
                id: customerId
            },
            data: {
                phone
            }
        });

        // Add address if address data is provided
        const platformSetting = await prisma.platformSetting.findUnique({ where: { id: 1 } });
        const settingsData = platformSetting?.data as any;
        const districtRequired = settingsData?.districtRequired !== false;

        const isCityValid = districtRequired ? (city && String(city).trim().length > 0) : true;

        if (
            fullName &&
            addressLine1 &&
            isCityValid &&
            state &&
            postalCode &&
            country
        ) {

            if (isDefault) {
                await prisma.customerAddress.updateMany({
                    where: {
                        customerId: customerId
                    },
                    data: {
                        isDefault: false
                    }
                });
            }

            await prisma.customerAddress.create({
                data: {
                    customerId: customerId,

                    type,
                    label,

                    fullName,
                    phone: phone ?? customer.phone ?? "",
                    addressLine1: addressLine1 ?? customer.addresses?.[0]?.addressLine1 ?? "",
                    addressLine2: addressLine2 ?? customer.addresses?.[0]?.addressLine2 ?? "",

                    city: city ? String(city).trim() : "",
                    state: state ?? customer.addresses?.[0]?.state ?? "",
                    postalCode: postalCode ?? customer.addresses?.[0]?.postalCode ?? "",
                    country: country ?? customer.addresses?.[0]?.country ?? "",

                    isDefault: isDefault ?? false
                }
            });
        }

        const addresses = await prisma.customerAddress.findMany({
            where: {
                customerId: customerId
            }
        });

        return res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: updatedCustomer.id,
                email: updatedCustomer.email,
                username: updatedCustomer.username,
                firstName: updatedCustomer.firstName,
                lastName: updatedCustomer.lastName,
                phone: updatedCustomer.phone,
                avatarUrl: updatedCustomer.avatarUrl,
                addresses
            }
        });

    } catch (error) {

        console.error("UPDATE PROFILE ERROR:", error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }


};

export const editProfile = async (req: Request, res: Response) => {
    try {

        const customerId = req.customerId!;

        const {
            firstName,
            lastName,
            username,
            phone
        } = req.body;

        const customer = await prisma.customer.findUnique({
            where: {
                id: customerId
            }
        });

        if (!customer) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        // Check username uniqueness if user is changing it
        if (
            username &&
            username !== customer.username
        ) {
            const existingUsername =
                await prisma.customer.findUnique({
                    where: {
                        username
                    }
                });

            if (existingUsername) {
                return res.status(400).json({
                    message: "Username already taken"
                });
            }
        }

        const updatedCustomer =
            await prisma.customer.update({
                where: {
                    id: customerId
                },
                data: {
                    firstName,
                    lastName,
                    username,
                    phone
                }
            });

        return res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: updatedCustomer.id,
                email: updatedCustomer.email,
                username: updatedCustomer.username,
                firstName: updatedCustomer.firstName,
                lastName: updatedCustomer.lastName,
                phone: updatedCustomer.phone,
                avatarUrl: updatedCustomer.avatarUrl
            }
        });

    } catch (error) {

        console.error("EDIT PROFILE ERROR:", error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }

};





export const deactivateAccount = async (req: Request, res: Response) => {
    const customerId = req.customerId!;
    const customer = await prisma.customer.findUnique({
        where: {
            id: customerId
        }
    });
    if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
    }



    const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: {
            isDeactivated: true,
            deactivatedAt: new Date(),
            scheduledDeleteAt: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
            )
        }
    });

    clearAuthCookie(res, 'customer_session');

    return res.status(200).json({
        message: "Account deactivated successfully",
        user: {
            id: updatedCustomer.id,
            email: updatedCustomer.email,
            username: updatedCustomer.username,
            firstName: updatedCustomer.firstName,
            lastName: updatedCustomer.lastName,
            phone: updatedCustomer.phone,
            avatarUrl: updatedCustomer.avatarUrl,
            isDeactivated: updatedCustomer.isDeactivated,
            deactivatedAt: updatedCustomer.deactivatedAt,
            scheduledDeleteAt: updatedCustomer.scheduledDeleteAt
        }
    });

}

export const deleteProfile = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId!;
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        await prisma.customer.delete({
            where: { id: customerId }
        });
        clearAuthCookie(res, 'customer_session');
        return res.status(200).json({
            message: 'Account deleted successfully', user: {
                id: customer.id,
                email: customer.email,
                username: customer.username,
                firstName: customer.firstName,
                lastName: customer.lastName
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
}
