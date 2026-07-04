import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error("FATAL: DATABASE_URL environment variable is missing.");
    process.exit(1);
}
console.log(`DATABASE_URL HOST = ${new URL(databaseUrl).hostname}`);

export const prisma = new PrismaClient();

// Admin initialization is now handled via /admin/api/auth/setup endpoint.
// See modules/admin/controllers/authController.ts for the setup logic.