import express from 'express';
const router = express.Router();

import { login, register ,logout, getProfile, updateProfile,  deactivateAccount , editProfile, deleteProfile, googleOAuth, forgotPassword, resetPassword  } from '../controllers/authcontroller.js';
import { getActiveStates, getActiveDistricts } from '../../seller/controllers/shopController.js';

import { customerAuth, customerAuthOptional } from '../../../middleware/customerAuth.js';
import {
    loginLimiter,
    registerLimiter,
    passwordLimiter,
    googleOAuthLimiter,
    publicReadLimiter,
} from '../../../middleware/rateLimiter.js';
import { cache } from '../../../middleware/cache.js';




router.post('/api/auth/login', loginLimiter, login);
router.post('/api/auth/register', registerLimiter, register);
router.post('/api/auth/logout', logout);
router.post('/api/auth/google', googleOAuthLimiter, googleOAuth);
router.post('/api/auth/forgot-password', passwordLimiter, forgotPassword);
router.post('/api/auth/reset-password', passwordLimiter, resetPassword);
router.get('/api/auth/profile', customerAuth, getProfile);
router.post('/api/auth/profile/update', customerAuth, updateProfile);
router.delete('/api/auth/profile/deactivate', customerAuth, deactivateAccount);
router.put('/api/auth/profile/edit', customerAuth, editProfile);
router.delete('/api/auth/profile/delete', customerAuth, deleteProfile);
router.get('/api/locations/states', publicReadLimiter, customerAuthOptional, cache(300), getActiveStates);
router.get('/api/locations/districts', publicReadLimiter, customerAuthOptional, cache(300), getActiveDistricts);


export default router;
