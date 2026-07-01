export const customersessionCookie = () => {
    return {
        name: 'customer_session',
        options: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict' as const,
            maxAge: 1000 * 60 * 60 * 24 * 7,
        },
    };
};

export const sellersessionCookie = () => {
    return {
        name: 'seller_session',
        options: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict' as const,
            maxAge: 1000 * 60 * 60 * 24 * 7,
        },
    };
};

export const adminsessionCookie = () => {
    return {
        name: 'admin_session',
        options: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict' as const,
            maxAge: 1000 * 60 * 60 * 24 * 60, // 60 days
        },
    };
};