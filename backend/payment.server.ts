import 'dotenv/config';
import { validateEnv } from './src/config/envValidator.js';

// Validate environment
validateEnv();

import http from 'http';
import express from 'express';
import { configureMiddlewares, configureErrorHandlers } from './src/app.js';
import { prisma } from './src/config/prisma.js';

// Payment routes
import customerPaymentRoutes from './src/modules/customer/routes/paymentRoute.js';
import corePaymentRoutes from './src/modules/payments/routes/paymentRoute.js';

const app = express();
configureMiddlewares(app);

app.use('/users', customerPaymentRoutes);
app.use('/', corePaymentRoutes);

configureErrorHandlers(app);

const PORT = Number(process.env.PAYMENT_PORT || process.env.PORT || 3005);
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Payment server is running on PORT : ${PORT}`);
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
