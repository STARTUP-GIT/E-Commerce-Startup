import type { Request, Response } from 'express';
import { prisma } from '../../../config/prisma.js'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signAccessToken } from '../../../config/token.js'
import { sellersessionCookie } from '../../../config/sessionCookies.js'
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

    const existingUser = await prisma.seller.findFirst({
        where: {
            OR: [
                { email },
                { username }
            ]
        }
    });

    

    if (existingUser) {
        return res.status(400).json({
            message: "user already exists"
        })
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const existingCustomer = await prisma.customer.findFirst({
        where: {
            OR: [
                { email },
                { username }
            ]
        }
    });
    
    if (existingCustomer) {
        return res.status(400).json({
            message: "Customer account already exists with this email or username"
        });
    }

    const newSeller = await prisma.seller.create({
        data: {
            firstName,
            lastName,
            username,   
            email,
            passwordHash: hashedPassword,
            authProvider: AuthProvider.EMAIL,
            status: 'PENDING_VERIFICATION',
        }
    });

    const token = signAccessToken(newSeller.id);
    const sessionCookie = sellersessionCookie();

    res.cookie(
        sessionCookie.name,
        token,
        sessionCookie.options
    );

    return res.status(201).json({
        user: {
            id: newSeller.id,
            email: newSeller.email,
            fullname: `${newSeller.firstName} ${newSeller.lastName ?? ""}`.trim()
        }
    });



}

export const login = async (req: Request, res: Response) => {
    const loginIdentifier = req.body.email || req.body.loginIdentifier || req.body.username;
    const { password } = req.body;

    if (!loginIdentifier || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if seller exists by email or username
    const seller = await prisma.seller.findFirst({
        where: {
            OR: [
                { email: loginIdentifier },
                { username: loginIdentifier }
            ]
        }
    });

    if (!seller) {
        // Check if customer exists with this email or username
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                OR: [
                    { email: loginIdentifier },
                    { username: loginIdentifier }
                ]
            }
        });
        if (existingCustomer) {
            return res.status(400).json({
                message: "This account is registered under the Customer Portal. Please log in through the Customer Portal."
            });
        }
        return res.status(404).json({ message: ' User not found' });
    }

    if (seller.isBanned) {
        return res.status(403).json({
            message: "Account is banned"
        });
    }

    // Check if the password is correct
    const isMatch = await bcrypt.compare(password, String(seller.passwordHash));
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signAccessToken(seller.id);

    const sessionCookie = sellersessionCookie();

    res.cookie(
        sessionCookie.name,
        token,
        sessionCookie.options
    );

    return res.status(200).json({
        message: "Login successful",
        user: {
            id: seller.id,
            email: seller.email,
            username: seller.username,
            firstName: seller.firstName,
            lastName: seller.lastName
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

        const existingCustomer = await prisma.customer.findUnique({
            where: {
                email
            }
        });
        
        if (existingCustomer) {
            return res.status(400).json({
                message: "This account is registered under the Customer Portal. Please log in through the Customer Portal."
            });
        }

        let seller = await prisma.seller.findUnique({
            where: {
                email
            }
        });

        if (seller) {
            seller = await prisma.seller.update({
                where: {
                    id: seller.id
                },
                data: {
                    googleId,
                    emailVerified: true,
                    firstName: firstName || seller.firstName,
                    lastName: lastName || seller.lastName,
                    avatarUrl: avatarUrl || seller.avatarUrl
                }
            });

            if (seller.isBanned) {
                return res.status(403).json({
                    message: "Account is banned"
                });
            }

            const token = signAccessToken(seller.id);
            const sessionCookie = sellersessionCookie();

            res.cookie(
                sessionCookie.name,
                token,
                sessionCookie.options
            );

            return res.status(200).json({
                message: "Google login successful",
                user: {
                    id: seller.id,
                    email: seller.email,
                    username: seller.username,
                    firstName: seller.firstName,
                    lastName: seller.lastName,
                    avatarUrl: seller.avatarUrl
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

        seller = await prisma.seller.create({
            data: {
                email,
                username,
                googleId,
                authProvider: AuthProvider.GOOGLE,
                firstName: firstName || username,
                lastName,
                avatarUrl,
                emailVerified: true,
                status: 'PENDING_VERIFICATION'
            }
        });

        if (seller.isBanned) {
            return res.status(403).json({
                message: "Account is banned"
            });
        }

        const token = signAccessToken(seller.id);
        const sessionCookie = sellersessionCookie();

        res.cookie(
            sessionCookie.name,
            token,
            sessionCookie.options
        );

        return res.status(201).json({
            message: "Google account created successfully",
            user: {
                id: seller.id,
                email: seller.email,
                username: seller.username,
                firstName: seller.firstName,
                lastName: seller.lastName,
                avatarUrl: seller.avatarUrl
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

    res.clearCookie("seller_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });

    return res.status(200).json({
        message: "Logged out successfully"
    });
};

export const getProfile = async (req: Request, res: Response) => { 
    const sellerId = req.sellerId!;
        const seller = await prisma.seller.findUnique({
        where: {
            id: sellerId
        },include: {
            addresses: true
        }

    });
    if (!seller) {
        return res.status(404).json({ message: 'seller not found' });
    }
    return res.status(200).json({
        message: "Profile fetched successfully",
        user: {
            id: seller.id,
            email: seller.email,
            username: seller.username,
            firstName: seller.firstName,
            lastName: seller.lastName,
            addresses: seller.addresses
        }
    });
}

export const updateProfile = async (req: Request,res: Response ) => {
    try {
    
        const {phone, type,label,firstName , lastName, fullName,addressLine1,addressLine2,city,state,postalCode,country,isDefault} = req.body;
    
        const sellerId = req.sellerId!;
    
        const seller = await prisma.seller.findUnique({
            where: {
                id: sellerId
            },include: {
                addresses: true
            }
        });
    
        if (!seller) {
            return res.status(404).json({
                message: "seller not found"
            });
        }
    
        // Update seller phone
        const updatedseller = await prisma.seller.update({
            where: {
                id: sellerId
            },
            data: {
                phone
            }
        });
    
        // Add address if address data is provided
        if (
            fullName &&
            addressLine1 &&
            city &&
            state &&
            postalCode &&
            country
        ) {
    
            if (isDefault) {
                await prisma.sellerAddress.updateMany({
                    where: {
                        sellerId: sellerId
                    },
                    data: {
                        isDefault: false
                    }
                });
            }
    
            
        }
    
       
        return res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: updatedseller.id    ,
                email: updatedseller.email,
                username: updatedseller.username,
                firstName: updatedseller.firstName,
                lastName: updatedseller.lastName,
                phone: updatedseller.phone,
                avatarUrl: updatedseller.avatarUrl,
            }
        });
    
    } catch (error) {
    
        console.error("UPDATE PROFILE ERROR:", error);
    
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
    
    
};
    
export const editProfile = async ( req: Request,res: Response ) => {
    try {

        const sellerId = req.sellerId!;
    
        const {
            firstName,
            lastName,
            username,
            phone
        } = req.body;
    
        const seller = await prisma.seller.findUnique({
            where: {
                id: sellerId
            }
        });
    
        if (!seller) {
            return res.status(404).json({
                message: "seller not found"
            });
        }
    
        // Check username uniqueness if user is changing it
        if (
            username &&
            username !== seller.username
        ) {
            const existingUsername =
                await prisma.seller.findUnique({
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
    
        const updatedseller =
            await prisma.seller.update({
                where: {
                    id: sellerId
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
                id: updatedseller.id,
                email: updatedseller.email,
                username: updatedseller.username,
                firstName: updatedseller.firstName,
                lastName: updatedseller.lastName,
                phone: updatedseller.phone,
                avatarUrl: updatedseller.avatarUrl
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
    const sellerId = req.sellerId!;
    const seller = await prisma.seller.findUnique({
        where: {
            id: sellerId
        }
    });
    if (!seller) {
        return res.status(404).json({ message: 'seller not found' });
    }



    const updatedseller = await prisma.seller.update({
        where: { id: sellerId },
        data: {
            isDeactivated: true,
            deactivatedAt: new Date(),
            scheduledDeleteAt: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
            )
        }
    });
    
    res.clearCookie("seller_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });
    
    return res.status(200).json({
        message: "Account deactivated successfully",
        user: {
            id: updatedseller.id,
            email: updatedseller.email,
            username: updatedseller.username,
            firstName: updatedseller.firstName,
            lastName: updatedseller.lastName,
            phone: updatedseller.phone,
            avatarUrl: updatedseller.avatarUrl,
            isDeactivated: updatedseller.isDeactivated,
            deactivatedAt: updatedseller.deactivatedAt,
            scheduledDeleteAt: updatedseller.scheduledDeleteAt
        }
    });

}

export const deleteProfile = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const seller = await prisma.seller.findUnique({
            where: { 
                id: sellerId 
            },
            include :{
                shop:true
            }
        });
        if (!seller) {
            return res.status(404).json({ message: 'seller not found' });
        }

        if(seller.shop){
            return res.status(400).json({
                message:'Cant Delete when Shop is added'
            })
        }

        await prisma.seller.delete({
            where: { id: sellerId }
        });
        res.clearCookie("seller_session", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });
        return res.status(200).json({ message: 'Account deleted successfully', user: {
            id: seller.id,
            email: seller.email,
            username: seller.username,
            firstName: seller.firstName,
            lastName: seller.lastName
        } });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const loginIdentifier = req.body.email || req.body.username || req.body.loginIdentifier;

        if (!loginIdentifier) {
            return res.status(400).json({ message: 'Email or Username is required' });
        }

        const seller = await prisma.seller.findFirst({
            where: {
                OR: [
                    { email: loginIdentifier },
                    { username: loginIdentifier }
                ]
            }
        });

        if (!seller) {
            return res.status(404).json({ message: 'Seller not found' });
        }

        // Generate 6-digit numeric OTP code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await bcrypt.hash(code, 10);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

        // Save OTP record to DB
        await prisma.otp.create({
            data: {
                entityType: 'SELLER',
                entityId: seller.id,
                email: seller.email,
                codeHash,
                purpose: 'PASSWORD_RESET',
                expiresAt,
            }
        });

        // Log OTP to console for local testing/verification
        console.log(`[FORGOT PASSWORD OTP] OTP for ${seller.email} is: ${code}`);

        return res.status(200).json({
            message: 'Password reset OTP has been sent successfully.',
            email: seller.email
        });

    } catch (error) {
        console.error('FORGOT PASSWORD ERROR:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const loginIdentifier = req.body.email || req.body.username || req.body.loginIdentifier;
        const { otp } = req.body;

        if (!loginIdentifier || !otp) {
            return res.status(400).json({ message: 'Email/Username and OTP are required' });
        }

        const seller = await prisma.seller.findFirst({
            where: {
                OR: [
                    { email: loginIdentifier },
                    { username: loginIdentifier }
                ]
            }
        });

        if (!seller) {
            return res.status(404).json({ message: 'Seller not found' });
        }

        // Get latest password reset OTP for this email
        const otpRecord = await prisma.otp.findFirst({
            where: {
                email: seller.email,
                purpose: 'PASSWORD_RESET',
                expiresAt: { gt: new Date() },
                usedAt: null
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
        }

        if (otpRecord.attempts >= otpRecord.maxAttempts) {
            return res.status(400).json({ message: 'Max attempts exceeded. Please request a new OTP.' });
        }

        // Verify the code match
        const isMatch = await bcrypt.compare(otp, otpRecord.codeHash);
        if (!isMatch) {
            await prisma.otp.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } }
            });
            return res.status(400).json({ message: 'Invalid OTP code. Please try again.' });
        }

        // Mark OTP as used
        await prisma.otp.update({
            where: { id: otpRecord.id },
            data: { usedAt: new Date() }
        });

        // Generate temporary password reset JWT token signed with JWT_SECRET_KEY (valid for 10 minutes)
        const resetToken = jwt.sign(
            { sellerId: seller.id, purpose: 'reset-password' },
            process.env.JWT_SECRET_KEY!,
            { expiresIn: '10m' }
        );

        return res.status(200).json({
            message: 'OTP verified successfully.',
            resetToken
        });

    } catch (error) {
        console.error('VERIFY OTP ERROR:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        let decoded: any;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET_KEY!);
        } catch (err) {
            return res.status(400).json({ message: 'Invalid or expired password reset token.' });
        }

        if (!decoded || decoded.purpose !== 'reset-password' || !decoded.sellerId) {
            return res.status(400).json({ message: 'Invalid reset token payload.' });
        }

        const seller = await prisma.seller.findUnique({
            where: { id: decoded.sellerId }
        });

        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        // Hash new password and save
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.seller.update({
            where: { id: seller.id },
            data: { passwordHash }
        });

        return res.status(200).json({
            message: 'Password updated successfully. Please log in with your new password.'
        });

    } catch (error) {
        console.error('RESET PASSWORD ERROR:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};