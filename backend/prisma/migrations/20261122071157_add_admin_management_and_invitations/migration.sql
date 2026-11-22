-- CreateEnum
CREATE TYPE "AdminAccountStatus" AS ENUM ('ACTIVE', 'PENDING_INVITATION', 'PENDING_APPROVAL', 'SUSPENDED', 'DISABLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AdminInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EmailChangeStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminActionType" ADD VALUE 'ADMIN_INVITATION_SENT';
ALTER TYPE "AdminActionType" ADD VALUE 'ADMIN_INVITATION_ACCEPTED';
ALTER TYPE "AdminActionType" ADD VALUE 'ADMIN_INVITATION_EXPIRED';
ALTER TYPE "AdminActionType" ADD VALUE 'ADMIN_ACCESS_REQUEST_APPROVED';
ALTER TYPE "AdminActionType" ADD VALUE 'ADMIN_ACCESS_REQUEST_REJECTED';
ALTER TYPE "AdminActionType" ADD VALUE 'ADMIN_PASSWORD_CHANGED';
ALTER TYPE "AdminActionType" ADD VALUE 'ADMIN_EMAIL_CHANGE_REQUESTED';
ALTER TYPE "AdminActionType" ADD VALUE 'ADMIN_EMAIL_CHANGED';
ALTER TYPE "AdminActionType" ADD VALUE 'DELIVERY_LOGO_UPDATED';

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "invitationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "invitationTokenHash" VARCHAR(255),
ADD COLUMN     "invitedAt" TIMESTAMP(3),
ADD COLUMN     "invitedById" VARCHAR(30),
ADD COLUMN     "status" "AdminAccountStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "admin_invitations" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "fullName" VARCHAR(150),
    "phone" VARCHAR(20),
    "roleId" VARCHAR(30),
    "roleName" VARCHAR(60) NOT NULL DEFAULT 'ADMIN',
    "tokenHash" VARCHAR(255) NOT NULL,
    "invitedById" VARCHAR(30) NOT NULL,
    "status" "AdminInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_access_requests" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "googleId" VARCHAR(255),
    "firstName" VARCHAR(100),
    "lastName" VARCHAR(100),
    "avatarUrl" VARCHAR(2048),
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reviewedById" VARCHAR(30),
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_email_changes" (
    "id" TEXT NOT NULL,
    "adminId" VARCHAR(30) NOT NULL,
    "currentEmail" VARCHAR(320) NOT NULL,
    "newEmail" VARCHAR(320) NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "status" "EmailChangeStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_email_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_invitations_tokenHash_key" ON "admin_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_invitations_email_idx" ON "admin_invitations"("email");

-- CreateIndex
CREATE INDEX "admin_invitations_status_idx" ON "admin_invitations"("status");

-- CreateIndex
CREATE INDEX "admin_invitations_tokenHash_idx" ON "admin_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_invitations_expiresAt_idx" ON "admin_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "admin_access_requests_email_idx" ON "admin_access_requests"("email");

-- CreateIndex
CREATE INDEX "admin_access_requests_status_idx" ON "admin_access_requests"("status");

-- CreateIndex
CREATE INDEX "admin_access_requests_expiresAt_idx" ON "admin_access_requests"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_changes_tokenHash_key" ON "admin_email_changes"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_email_changes_adminId_idx" ON "admin_email_changes"("adminId");

-- CreateIndex
CREATE INDEX "admin_email_changes_tokenHash_idx" ON "admin_email_changes"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_email_changes_status_idx" ON "admin_email_changes"("status");

-- CreateIndex
CREATE INDEX "admins_status_idx" ON "admins"("status");

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "admin_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_access_requests" ADD CONSTRAINT "admin_access_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_email_changes" ADD CONSTRAINT "admin_email_changes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
