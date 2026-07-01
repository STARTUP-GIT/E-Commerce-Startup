import type { Request, Response } from 'express';
import { prisma } from '../../../config/prisma.js'
import bcrypt from 'bcryptjs';
import { signAccessToken } from '../../../config/token.js'
import { customersessionCookie } from '../../../config/sessionCookies.js'
import { AuthProvider } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);




export const register = async (req: Request, res: Response) => {
    const { username, email, password, firstName, lastName } = req.body;

    // Validate input
    if (!username || !email || !password || !firstName) {
        return res.status(400).json({ message: 'All fields are required' });
    }


    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const isEmailValidFormat = regex.test(email)

    if (!isEmailValidFormat) {
        return res.status(400).json({ message: "Email not in format" })
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be of min 6 characters" })
    }


    // Check if user already exists

    const existingUser = await prisma.customer.findFirst({
        where: {
            OR: [
                { email },
                { username }
            ]
        }
    });

    const exists = await prisma.seller.findFirst({
        where: {
            OR: [
                { email },
                { username }
            ]
        }
    })

    if (exists) {
        return res.status(400).json({
            message: "Seller Account Already exists with this email or username"
        })
    }

    if (existingUser) {
        return res.status(400).json({
            message: "user already exists"
        })
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newuser = await prisma.customer.create({
        data: {
            firstName,
            lastName,
            username,
            email,
            passwordHash: hashedPassword,
            authProvider: AuthProvider.EMAIL,
        }
    });

    const token = signAccessToken(newuser.id);
    const sessionCookie = customersessionCookie();

    res.cookie(
        sessionCookie.name,
        token,
        sessionCookie.options
    );

    return res.status(201).json({
        user: {
            id: newuser.id,
            email: newuser.email,
            username: newuser.username,
            fullname: `${newuser.firstName} ${newuser.lastName ?? ""}`.trim()
        }
    });



}

export const login = async (req: Request, res: Response) => {
    const loginIdentifier = req.body.email || req.body.loginIdentifier || req.body.username;
    const { password } = req.body;

    if (!loginIdentifier || !password) {
        return res.status(400).json({ message: 'All fields are required' });
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
        return res.status(404).json({ message: ' User not found' });
    }

    if (customer.isBanned) {
        return res.status(403).json({
            message: "Account is banned"
        });
    }

    // Check if the password is correct
    const isMatch = await bcrypt.compare(password, String(customer.passwordHash));
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signAccessToken(customer.id);

    const sessionCookie = customersessionCookie();

    res.cookie(
        sessionCookie.name,
        token,
        sessionCookie.options
    );

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
}



export const googleOAuth = async (req: Request, res: Response) => {
    try {
        let email: string;
        let googleId: string;
        let firstName: string = "";
        let lastName: string = "";
        let avatarUrl: string = "";

        const { idToken, email: bodyEmail, firstName: bodyFirstName, lastName: bodyLastName, avatarUrl: bodyAvatarUrl, googleId: bodyGoogleId } = req.body;

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
            googleId = bodyGoogleId || `google_${email}`;
            firstName = bodyFirstName || "";
            lastName = bodyLastName || "";
            avatarUrl = bodyAvatarUrl || "";
        } else {
            return res.status(400).json({
                message: "Google token or user info is required"
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
                    googleId,
                    emailVerified: true,
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
            const sessionCookie = customersessionCookie();

            res.cookie(
                sessionCookie.name,
                token,
                sessionCookie.options
            );

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
                googleId,
                authProvider: AuthProvider.GOOGLE,
                firstName,
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
        const sessionCookie = customersessionCookie();

        res.cookie(
            sessionCookie.name,
            token,
            sessionCookie.options
        );

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

    res.clearCookie("customer_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });

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

    res.clearCookie("customer_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });

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
        res.clearCookie("customer_session", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });
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