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

// Seller routes
import sellerAuth from './src/modules/seller/routes/authroute.js';
import shopRoutes from './src/modules/seller/routes/shopRoute.js';
import sellerProfileRoute from './src/modules/seller/routes/profileRoute.js';
import sellerLocationRoute from './src/modules/seller/routes/locationRoute.js';
import sellerProducts from './src/modules/seller/routes/productRoute.js';
import ordersRoutes from './src/modules/seller/routes/ordersRoute.js';
import analyticsRoutes from './src/modules/seller/routes/analyticsRoute.js';
import customOrderRoutes from './src/modules/seller/routes/customOrderRoute.js';
import notificationRoutes from './src/modules/seller/routes/notificationRoute.js';
import payoutRoutes from './src/modules/seller/routes/payoutRoute.js';
import reviewRoutes from './src/modules/seller/routes/reviewRoute.js';
import sellerCategoryRoute from './src/modules/seller/routes/categoryRoute.js';
import storageRoute from './src/modules/storage/routes/storage.routes.js';

const app = express();
configureMiddlewares(app);

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
app.use('/seller', sellerCategoryRoute);
app.use('/api/storage', storageRoute);

configureErrorHandlers(app);

const PORT = Number(process.env.SELLER_PORT || process.env.PORT || 3002);
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Seller server is running on PORT : ${PORT}`);
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
