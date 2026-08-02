import express from 'express';
const router = express.Router();

import { login, register, logout, getProfile, updateProfile, deactivateAccount, editProfile, deleteProfile, googleOAuth, forgotPassword, verifyOtp, resetPassword } from '../controllers/authController.js';

import { sellerAuth } from '../../../middleware/sellerAuth.js';
import {
    loginLimiter,
    registerLimiter,
    passwordLimiter,
    otpLimiter,
    googleOAuthLimiter,
} from '../../../middleware/rateLimiter.js';

router.post('/api/auth/login', loginLimiter, login);
router.post('/api/auth/register', registerLimiter, register);
router.post('/api/auth/logout', logout);
router.post('/api/auth/google', googleOAuthLimiter, googleOAuth);
router.post('/api/auth/forgot-password', passwordLimiter, forgotPassword);
router.post('/api/auth/verify-otp', otpLimiter, verifyOtp);
router.post('/api/auth/reset-password', passwordLimiter, resetPassword);
router.get('/api/auth/profile', sellerAuth, getProfile);
router.post('/api/auth/profile/update', sellerAuth, updateProfile);
router.delete('/api/auth/profile/deactivate', sellerAuth, deactivateAccount);
router.put('/api/auth/profile/edit', sellerAuth, editProfile);
router.delete('/api/auth/profile/delete', sellerAuth, deleteProfile);
export default router;