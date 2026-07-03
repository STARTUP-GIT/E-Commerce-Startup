export const customersessionCookie = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        name: 'customer_session',
        options: {
            httpOnly: true,
            secure: isProduction,
            sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7,
        },
    };
};

export const sellersessionCookie = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        name: 'seller_session',
        options: {
            httpOnly: true,
            secure: isProduction,
            sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7,
        },
    };
};

export const adminsessionCookie = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        name: 'admin_session',
        options: {
            httpOnly: true,
            secure: isProduction,
            sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 60, // 60 days
        },
    };
};