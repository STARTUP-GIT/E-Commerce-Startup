import 'dotenv/config';
import { validateEnv } from './src/config/envValidator.js';

// Validate environment
validateEnv();

import { seedKarnatakaDistricts } from './src/config/seedDistricts.js';
seedKarnatakaDistricts().catch(console.error);

import { syncPlatformDefaults } from './src/modules/platform/services/syncService.js';
syncPlatformDefaults().catch((err) => console.error('[platform] Platform sync failed on startup:', err));

import http from 'http';
import app from './src/app.js';
import { prisma } from './src/config/prisma.js';

const PORT = Number(process.env.PORT || process.env.CUSTOMER_PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const server = http.createServer(app);

console.log('[SERVER_START] ' + JSON.stringify({
    portConfigured: !!process.env.PORT,
    host: HOST,
    starting: true,
}));

server.listen(PORT, HOST, () => {
    console.log(`[SERVER_READY] Default server is running on ${HOST}:${PORT}`);
});

server.on('error', (err) => {
    console.error('[SERVER_ERROR]', err?.message ?? err);
    // A listen failure (EADDRINUSE/EACCES) before the socket is bound leaves the
    // process alive with no open port, so a platform health/port scan times out
    // instead of restarting us. Exit so the process supervisor restarts cleanly.
    if (!server.listening) {
        console.error('[SERVER_ERROR] Fatal listen error - exiting process.');
        process.exit(1);
    }
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

    // Force shutdown after 10s
    setTimeout(() => {
        console.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
    }, 10000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
