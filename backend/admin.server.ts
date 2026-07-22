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

app.use('/api/admin/auth', adminAuthRoute);  // /api/admin/auth/login, /api/admin/auth/setup/status
app.use('/api/admin', adminAuthRoute);        // /api/admin/profile, /api/admin/list, /api/admin/:id/status
app.use('/admin', adminAuthRoute);            // /admin/setup/status (legacy fallback)
app.use('/api/admin/analytics', adminAnalyticsRoute);
app.use('/api/admin/sellers', adminSellerRoute);
app.use('/api/admin/customers', adminCustomerRoute);
app.use('/api/admin/shops', adminShopRoute);
app.use('/api/admin/products', adminProductRoute);
app.use('/api/admin/orders', adminOrderRoute);
app.use('/api/admin/payments', adminPaymentRoute);
app.use('/api/admin/reviews', adminReviewRoute);
app.use('/api/admin/notifications', adminNotificationRoute);
app.use('/api/admin/reports', adminReportRoute);
app.use('/api/admin/coupons', adminCouponRoute);
app.use('/api/admin/settings', adminSettingsRoute);
app.use('/api/admin/logs', adminLogRoute);
app.use('/api/admin/cities', adminCityRoute);
app.use('/api/admin/states', adminStateRoute);
app.use('/api/admin/categories', adminCategoryRoute);
app.use('/api/admin/payment-methods', adminPaymentMethodRoute);
app.use('/api/admin/delivery-methods', adminDeliveryMethodRoute);
app.use('/api/admin', adminDeliveryRoute);

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
