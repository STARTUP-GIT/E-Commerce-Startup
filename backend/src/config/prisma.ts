import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error("FATAL: DATABASE_URL environment variable is missing.");
    process.exit(1);
}

const isProduction = process.env.NODE_ENV?.toLowerCase() === 'production';

if (!process.env.DIRECT_URL) {
    if (isProduction) {
        console.error("FATAL: Missing environment variable DIRECT_URL. Expected a Neon direct connection string.");
        process.exit(1);
    }
    console.warn("WARNING: DIRECT_URL is not set. Falling back to DATABASE_URL for local development only.");
    process.env.DIRECT_URL = databaseUrl;
}

export const prisma = new PrismaClient();

// Admin initialization is now handled via /admin/api/auth/setup endpoint.
// See modules/admin/controllers/authController.ts for the setup logic.