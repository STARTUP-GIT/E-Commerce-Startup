import jwt from 'jsonwebtoken';

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'Missing JWT secret. Set JWT_SECRET_KEY (production) or JWT_SECRET (development) before starting the server.'
    );
  }
  return secret;
};

export const signAccessToken = (userId: string, expiresIn = '7d') => {
  return jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: expiresIn as any });
};

export const signRefreshToken = (userId: string, expiresIn = '30d') => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET_KEY || getJwtSecret(), {
    expiresIn: expiresIn as any,
  });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, getJwtSecret());
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET_KEY || getJwtSecret());
};