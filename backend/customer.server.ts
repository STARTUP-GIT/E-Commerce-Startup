import 'dotenv/config';
import { validateEnv } from './src/config/envValidator.js';

// Validate environment
validateEnv();

import http from 'http';
import express from 'express';
import { configureMiddlewares, configureErrorHandlers } from './src/app.js';
import { prisma } from './src/config/prisma.js';

// Customer routes
import userAuth from './src/modules/customer/routes/authroutes.js';
import customerShopRoutes from './src/modules/customer/routes/shopRoute.js';
import customerProductRoutes from './src/modules/customer/routes/productRoute.js';
import customerCartRoutes from './src/modules/customer/routes/cartRoute.js';
import customerWishlistRoutes from './src/modules/customer/routes/wishlistRoute.js';
import customerCheckoutRoutes from './src/modules/customer/routes/checkoutRoute.js';
import customerPaymentRoutes from './src/modules/customer/routes/paymentRoute.js';
import customerOrderRoutes from './src/modules/customer/routes/orderRoute.js';
import customerReviewRoutes from './src/modules/customer/routes/reviewRoute.js';
import customerNotificationRoutes from './src/modules/customer/routes/notificationRoute.js';
import customerCustomOrderRoutes from './src/modules/customer/routes/customOrderRoute.js';
import customerCityRoute from './src/modules/customer/routes/cityRoute.js';
import corePaymentRoutes from './src/modules/payments/routes/paymentRoute.js';
import storageRoute from './src/modules/storage/routes/storageRoute.js';

const app = express();
configureMiddlewares(app);

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
app.use('/api/storage', storageRoute);

configureErrorHandlers(app);

const PORT = Number(process.env.CUSTOMER_PORT || 3001);
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Customer server is running on PORT : ${PORT}`);
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
