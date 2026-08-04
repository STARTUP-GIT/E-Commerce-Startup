import 'dotenv/config';
import { validateEnv } from './src/config/envValidator.js';

// Validate environment
validateEnv();

import { seedPlatformRolesAndPermissions } from './src/modules/platform/utils/platformRoles.js';
import { ensureDefaultFeatureFlags } from './src/modules/platform/controllers/featureFlagController.js';

seedPlatformRolesAndPermissions().catch(console.error);
ensureDefaultFeatureFlags().catch(console.error);

import http from 'http';
import express from 'express';
import { configureMiddlewares, configureErrorHandlers } from './src/app.js';
import { prisma } from './src/config/prisma.js';
import platformRoute from './src/modules/platform/routes/index.js';

const app = express();
configureMiddlewares(app);

// Platform module routes — entirely independent of Admin/Seller/Customer modules.
app.use('/api/platform', platformRoute);

// Public health probe
app.get('/api/platform/healthz', (_req, res) => {
    res.status(200).json({ status: 'OK', service: 'platform', timestamp: new Date().toISOString() });
});

configureErrorHandlers(app);

const PORT = Number(process.env.PLATFORM_PORT || process.env.PORT || 3006);
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Platform server is running on PORT : ${PORT}`);
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
