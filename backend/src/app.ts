/** dependences */
import express from 'express';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';

/** files import */
import userAuth from './modules/customer/routes/authroutes.js';
import customerShopRoutes from './modules/customer/routes/shopRoute.js';
import customerProductRoutes from './modules/customer/routes/productRoute.js';
import customerCartRoutes from './modules/customer/routes/cartRoute.js';
import customerWishlistRoutes from './modules/customer/routes/wishlistRoute.js';
import customerCheckoutRoutes from './modules/customer/routes/checkoutRoute.js';
import customerPaymentRoutes from './modules/customer/routes/paymentRoute.js';
import customerOrderRoutes from './modules/customer/routes/orderRoute.js';
import customerReviewRoutes from './modules/customer/routes/reviewRoute.js';
import customerNotificationRoutes from './modules/customer/routes/notificationRoute.js';
import customerCustomOrderRoutes from './modules/customer/routes/customOrderRoute.js';
import customerCityRoute from './modules/customer/routes/cityRoute.js';
import corePaymentRoutes from './modules/payments/routes/paymentRoute.js';

import sellerAuth from './modules/seller/routes/authroute.js';
import shopRoutes from './modules/seller/routes/shopRoute.js';
import { limiter } from './middleware/ratelimiter.js';
import sellerProducts from './modules/seller/routes/productRoute.js';
import ordersRoutes from './modules/seller/routes/ordersRoute.js';
import analyticsRoutes from './modules/seller/routes/analyticsRoute.js';
import customOrderRoutes from './modules/seller/routes/customOrderRoute.js';
import notificationRoutes from './modules/seller/routes/notificationRoute.js';
import payoutRoutes from './modules/seller/routes/payoutRoute.js';
import reviewRoutes from './modules/seller/routes/reviewRoute.js';

import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import "./jobs/cron.js";

// Admin module routes
import adminAuthRoute from './modules/admin/routes/authRoute.js';
import adminAnalyticsRoute from './modules/admin/routes/analyticsRoute.js';
import adminSellerRoute from './modules/admin/routes/sellerRoute.js';
import adminCustomerRoute from './modules/admin/routes/customerRoute.js';
import adminShopRoute from './modules/admin/routes/shopRoute.js';
import adminProductRoute from './modules/admin/routes/productRoute.js';
import adminOrderRoute from './modules/admin/routes/orderRoute.js';
import adminPaymentRoute from './modules/admin/routes/paymentRoute.js';
import adminReviewRoute from './modules/admin/routes/reviewRoute.js';
import adminNotificationRoute from './modules/admin/routes/notificationRoute.js';
import adminReportRoute from './modules/admin/routes/reportRoute.js';
import adminCouponRoute from './modules/admin/routes/couponRoute.js';
import adminSettingsRoute from './modules/admin/routes/settingsRoute.js';
import adminLogRoute from './modules/admin/routes/logRoute.js';
import adminCityRoute from './modules/admin/routes/cityRoute.js';
import adminStateRoute from './modules/admin/routes/stateRoute.js';

// Delivery module routes
import deliveryRoute from './modules/delivery/routes/deliveryRoute.js';
import sellerDeliveryRoute from './modules/delivery/routes/sellerDeliveryRoute.js';
import adminDeliveryRoute from './modules/delivery/routes/adminDeliveryRoute.js';
import deliveryWebhook from './modules/delivery/webhooks/deliveryWebhook.js';
import storageRoute from './modules/storage/routes/storageRoute.js';

export const configureMiddlewares = (app: express.Express) => {
    if (process.env.NODE_ENV === 'production') {
        app.set('trust proxy', 1);
    }

    /** middlewares */
    app.use(helmet());
    app.use(compression());
    app.use(express.json({
        limit: '10mb',
        verify: (req: any, res, buf) => {
            req.rawBody = buf;
        }
    }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));
    app.use(cookieParser());
    app.use(cors({
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : true,
        credentials: true
    }));
    app.use(requestLogger);
    app.use(limiter);

    /** main route */
    app.get('/', (req: Request, res: Response) => {
        res.json({
            message: `Hello`
        });
    });

    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
    });
};

export const configureErrorHandlers = (app: express.Express) => {
    app.use(errorHandler);
};

const app = express();
configureMiddlewares(app);

/** routes */
// user routes
app.use('/users', userAuth);
app.use('/users', customerShopRoutes);
app.use('/users', customerProductRoutes);
app.use('/users', customerCartRoutes);
app.use('/users', customerWishlistRoutes);
app.use('/users', customerCheckoutRoutes);
app.use('/users', customerPaymentRoutes);
app.use('/users', customerOrderRoutes);
app.use('/users', customerReviewRoutes);
app.use('/users', customerNotificationRoutes);
app.use('/users', customerCustomOrderRoutes);
app.use('/users/cities', customerCityRoute);
app.use('/', corePaymentRoutes);

//seller routes 
app.use('/seller', sellerAuth);
app.use('/seller', shopRoutes);
app.use('/seller', sellerProducts);
app.use('/seller', ordersRoutes);
app.use('/seller', analyticsRoutes);
app.use('/seller', customOrderRoutes);
app.use('/seller', notificationRoutes);
app.use('/seller', payoutRoutes);
app.use('/seller', reviewRoutes);

// Admin routes
app.use('/api/admin/auth', adminAuthRoute);
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

// Delivery routes
app.use('/', deliveryRoute);
app.use('/', sellerDeliveryRoute);
app.use('/api/admin', adminDeliveryRoute);
app.use('/', deliveryWebhook);
app.use('/api/storage', storageRoute);

configureErrorHandlers(app);

export default app;