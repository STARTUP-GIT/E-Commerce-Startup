import 'dotenv/config';
import { validateEnv } from './src/config/envValidator.js';

// Validate environment
validateEnv();

import { seedKarnatakaDistricts } from './src/config/seedDistricts.js';
seedKarnatakaDistricts().catch(console.error);

import http from 'http';
import express from 'express';
import { configureMiddlewares, configureErrorHandlers } from './src/app.js';
import { prisma } from './src/config/prisma.js';
import { adminLimiter } from './src/middleware/rateLimiter.js';

// Admin routes
import adminAuthRoute from './src/modules/admin/routes/authRoute.js';
import adminAnalyticsRoute from './src/modules/admin/routes/analyticsRoute.js';
import adminSellerRoute from './src/modules/admin/routes/sellerRoute.js';
import adminCustomerRoute from './src/modules/admin/routes/customerRoute.js';
import adminShopRoute from './src/modules/admin/routes/shopRoute.js';
import adminProductRoute from './src/modules/admin/routes/productRoute.js';
import adminOrderRoute from './src/modules/admin/routes/orderRoute.js';
import adminPaymentRoute from './src/modules/admin/routes/paymentRoute.js';
import adminReviewRoute from './src/modules/admin/routes/reviewRoute.js';
import adminNotificationRoute from './src/modules/admin/routes/notificationRoute.js';
import adminReportRoute from './src/modules/admin/routes/reportRoute.js';
import adminCouponRoute from './src/modules/admin/routes/couponRoute.js';
import adminSettingsRoute from './src/modules/admin/routes/settingsRoute.js';
import adminLogRoute from './src/modules/admin/routes/logRoute.js';
import adminCityRoute from './src/modules/admin/routes/cityRoute.js';
import adminStateRoute from './src/modules/admin/routes/stateRoute.js';
import adminCategoryRoute from './src/modules/admin/routes/categoryRoute.js';
import adminPaymentMethodRoute from './src/modules/admin/routes/paymentMethodRoute.js';
import adminDeliveryMethodRoute from './src/modules/admin/routes/deliveryMethodRoute.js';
import adminDeliveryRoute from './src/modules/delivery/routes/adminDeliveryRoute.js';
import { ensureDefaultPaymentMethods } from './src/modules/admin/controllers/paymentMethodController.js';
import { ensureDefaultDeliveryMethods } from './src/modules/admin/controllers/deliveryMethodController.js';

ensureDefaultPaymentMethods().catch(err => console.error("Auto-seed payment methods failed:", err));
ensureDefaultDeliveryMethods().catch(err => console.error("Auto-seed delivery methods failed:", err));

const app = express();
configureMiddlewares(app);

app.use('/api/admin/auth', adminLimiter, adminAuthRoute);  // /api/admin/auth/login, /api/admin/auth/setup/status
app.use('/api/admin', adminLimiter, adminAuthRoute);        // /api/admin/profile, /api/admin/list, /api/admin/:id/status
app.use('/admin', adminLimiter, adminAuthRoute);            // /admin/setup/status (legacy fallback)
app.use('/api/admin/analytics', adminLimiter, adminAnalyticsRoute);
app.use('/api/admin/sellers', adminLimiter, adminSellerRoute);
app.use('/api/admin/customers', adminLimiter, adminCustomerRoute);
app.use('/api/admin/shops', adminLimiter, adminShopRoute);
app.use('/api/admin/products', adminLimiter, adminProductRoute);
app.use('/api/admin/orders', adminLimiter, adminOrderRoute);
app.use('/api/admin/payments', adminLimiter, adminPaymentRoute);
app.use('/api/admin/reviews', adminLimiter, adminReviewRoute);
app.use('/api/admin/notifications', adminLimiter, adminNotificationRoute);
app.use('/api/admin/reports', adminLimiter, adminReportRoute);
app.use('/api/admin/coupons', adminLimiter, adminCouponRoute);
app.use('/api/admin/settings', adminLimiter, adminSettingsRoute);
app.use('/api/admin/logs', adminLimiter, adminLogRoute);
app.use('/api/admin/cities', adminLimiter, adminCityRoute);
app.use('/api/admin/states', adminLimiter, adminStateRoute);
app.use('/api/admin/categories', adminLimiter, adminCategoryRoute);
app.use('/api/admin/payment-methods', adminLimiter, adminPaymentMethodRoute);
app.use('/api/admin/delivery-methods', adminLimiter, adminDeliveryMethodRoute);
app.use('/api/admin', adminLimiter, adminDeliveryRoute);

configureErrorHandlers(app);

const PORT = Number(process.env.ADMIN_PORT || process.env.PORT || 3003);
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Admin server is running on PORT : ${PORT}`);
});

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
        console.log("HTTP server closed.");
        try {
            await prisma.$disconnect();
            console.log("Prisma disconnected.");
        } catch (err) {
            console.error("Error during Prisma disconnect:", err);
        }
        process.exit(0);
    });

    setTimeout(() => {
        console.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
    }, 10000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
