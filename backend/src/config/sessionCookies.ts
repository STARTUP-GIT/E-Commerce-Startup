import type { Response } from 'express';

type CookieName = 'customer_session' | 'seller_session' | 'admin_session';

const isProductionEnv = () => process.env.NODE_ENV?.toLowerCase() === 'production';

const cookieOptions = (isProduction: boolean) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
} as const);

const maxAges: Record<CookieName, number> = {
  customer_session: 1000 * 60 * 60 * 24 * 7,       // 7 days
  seller_session: 1000 * 60 * 60 * 24 * 7,          // 7 days
  admin_session: 1000 * 60 * 60 * 24 * 60,          // 60 days
};

export const setAuthCookie = (res: Response, name: CookieName, token: string) => {
  const isProduction = isProductionEnv();
  res.cookie(name, token, {
    ...cookieOptions(isProduction),
    maxAge: maxAges[name],
    path: '/',
  });
};

export const clearAuthCookie = (res: Response, name: CookieName) => {
  const isProduction = isProductionEnv();
  res.clearCookie(name, {
    ...cookieOptions(isProduction),
    path: '/',
  });
};

export const setRefreshCookie = (res: Response, token: string) => {
  const isProduction = isProductionEnv();
  res.cookie('admin_refresh', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
};

export const clearRefreshCookie = (res: Response) => {
  const isProduction = isProductionEnv();
  res.clearCookie('admin_refresh', {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  });
};

// Legacy named exports kept for backwards compatibility
export const customersessionCookie = () => ({
  name: 'customer_session' as CookieName,
  options: cookieOptions(isProductionEnv()),
});

export const sellersessionCookie = () => ({
  name: 'seller_session' as CookieName,
  options: cookieOptions(isProductionEnv()),
});

export const adminsessionCookie = () => ({
  name: 'admin_session' as CookieName,
  options: cookieOptions(isProductionEnv()),
});
