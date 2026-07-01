/*
  Warnings:

  - Added the required column `fullName` to the `seller_addresses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "seller_addresses" ADD COLUMN     "fullName" VARCHAR(200) NOT NULL;
