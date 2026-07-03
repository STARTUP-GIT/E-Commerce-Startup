import express from 'express';
const router = express.Router();

import { login, register ,logout, getProfile, updateProfile,  deactivateAccount , editProfile, deleteProfile, googleOAuth, forgotPassword, resetPassword  } from '../controllers/authcontroller.js';
import { getActiveStates, getActiveDistricts } from '../../seller/controllers/shopController.js';

import { customerAuth, customerAuthOptional } from '../../../middleware/customerAuth.js';




router.post('/api/auth/login', login);
router.post('/api/auth/register', register);
router.post('/api/auth/logout', logout);
router.post('/api/auth/google', googleOAuth);
router.post('/api/auth/forgot-password', forgotPassword);
router.post('/api/auth/reset-password', resetPassword);
router.get('/api/auth/profile', customerAuth, getProfile);
router.post('/api/auth/profile/update', customerAuth, updateProfile);
router.delete('/api/auth/profile/deactivate', customerAuth, deactivateAccount);
router.put('/api/auth/profile/edit', customerAuth, editProfile);
router.delete('/api/auth/profile/delete', customerAuth, deleteProfile);
router.get('/api/locations/states', customerAuthOptional, getActiveStates);
router.get('/api/locations/districts', customerAuthOptional, getActiveDistricts);


export default router;
