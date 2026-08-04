import 'dotenv/config';
import { validateEnv } from './src/config/envValidator.js';

// Validate environment
validateEnv();

import { seedPlatformRolesAndPermissions } from './src/modules/platform/utils/platformRoles.js';
import { syncFeatureDefinitions } from './src/modules/platform/services/featureFlagService.js';

seedPlatformRolesAndPermissions().catch(console.error);

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
let server: http.Server;

// On server startup: automatically register any feature that is defined in code
// but missing from the database. Existing records are never deleted and their
// enabled state is never touched.
const start = async () => {
    try {
        await syncFeatureDefinitions();
    } catch (error) {
        console.error('[platform] Feature registry sync failed:', error);
    }

    server = http.createServer(app);
    server.listen(PORT, () => {
        console.log(`Platform server is running on PORT : ${PORT}`);
    });
};

start();

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
    if (!server) return;
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
