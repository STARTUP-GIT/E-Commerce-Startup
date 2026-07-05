-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "googleId" VARCHAR(255),
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'ADMIN',
ALTER COLUMN "passwordHash" DROP NOT NULL;
