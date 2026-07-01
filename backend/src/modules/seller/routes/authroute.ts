import express from 'express';
const router = express.Router();

import { login, register, logout, getProfile, updateProfile, deactivateAccount, editProfile, deleteProfile, googleOAuth, forgotPassword, verifyOtp, resetPassword } from '../controllers/authController.js';

import { sellerAuth } from '../../../middleware/sellerAuth.js';

router.post('/api/auth/login', login);
router.post('/api/auth/register', register);
router.post('/api/auth/logout', logout);
router.post('/api/auth/google', googleOAuth);
router.post('/api/auth/forgot-password', forgotPassword);
router.post('/api/auth/verify-otp', verifyOtp);
router.post('/api/auth/reset-password', resetPassword);
router.get('/api/auth/profile', sellerAuth, getProfile);
router.post('/api/auth/profile/update', sellerAuth, updateProfile);
router.delete('/api/auth/profile/deactivate', sellerAuth, deactivateAccount);
router.put('/api/auth/profile/edit', sellerAuth, editProfile);
router.delete('/api/auth/profile/delete', sellerAuth, deleteProfile);
export default router;