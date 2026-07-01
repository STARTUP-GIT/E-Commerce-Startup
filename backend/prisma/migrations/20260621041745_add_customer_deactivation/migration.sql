-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "isDeactivated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduledDeleteAt" TIMESTAMP(3);
