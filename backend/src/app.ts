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
import customerLocationRoute from './modules/customer/routes/locationRoute.js';
import corePaymentRoutes from './modules/payments/routes/paymentRoute.js';

import sellerAuth from './modules/seller/routes/authroute.js';
import shopRoutes from './modules/seller/routes/shopRoute.js';
import sellerProfileRoute from './modules/seller/routes/profileRoute.js';
import sellerLocationRoute from './modules/seller/routes/locationRoute.js';
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
import storageRoute from './modules/storage/routes/storage.routes.js';

export const configureMiddlewares = (app: express.Express) => {
    if (process.env.NODE_ENV?.toLowerCase() === 'production') {
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

    const normalizeOrigin = (o: string) => o.replace(/\/+$/, '').toLowerCase();

    const rawOrigins = [
        process.env.CORS_ORIGINS,
        process.env.CUSTOMER_FRONTEND_URL,
        process.env.SELLER_FRONTEND_URL,
        process.env.ADMIN_FRONTEND_URL,
    ].filter(Boolean).join(',').split(',').map(s => normalizeOrigin(s.trim())).filter(Boolean);

    const localDevOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8001',
    ].map(normalizeOrigin);

    const allowedOrigins = new Set([...rawOrigins, ...localDevOrigins]);

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
                callback(null, true);
            } else {
                callback(new Error(`Origin ${origin} not allowed by CORS`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
        optionsSuccessStatus: 204,
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
app.use('/customer', userAuth);
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
app.use('/customer/api/location', customerLocationRoute);
app.use('/', corePaymentRoutes);

//seller routes 
app.use('/seller', sellerAuth);
app.use('/seller', shopRoutes);
app.use('/seller', sellerProfileRoute);
app.use('/seller', sellerLocationRoute);
app.use('/seller', sellerProducts);
app.use('/seller', ordersRoutes);
app.use('/seller', analyticsRoutes);
app.use('/seller', customOrderRoutes);
app.use('/seller', notificationRoutes);
app.use('/seller', payoutRoutes);
app.use('/seller', reviewRoutes);

// Admin routes
app.use('/api/admin/auth', adminAuthRoute);
app.use('/admin', adminAuthRoute);
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
