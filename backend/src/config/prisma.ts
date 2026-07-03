import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error("FATAL: DATABASE_URL environment variable is missing.");
    process.exit(1);
}
const dbHost = new URL(databaseUrl).hostname;
console.log(`DATABASE_URL HOST = ${dbHost}`);
const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

async function seedDefaultAdmin() {
    try {
        const email = "satharya0123@gmail.com";
        const existing = await prisma.admin.findUnique({
            where: { email }
        });

        if (!existing) {
            const password = "Startup0123@0204";
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            await prisma.admin.create({
                data: {
                    email,
                    passwordHash,
                    firstName: "Default",
                    lastName: "Admin",
                    isSuperAdmin: true,
                    isActive: true
                }
            });
            console.log("Default admin seeded successfully.");
        }
    } catch (error: any) {
        if (error.code === 'P2002') {
            // Already seeded concurrently, ignore
            return;
        }
        console.error("Failed to seed default admin:", error);
    }
}

seedDefaultAdmin();