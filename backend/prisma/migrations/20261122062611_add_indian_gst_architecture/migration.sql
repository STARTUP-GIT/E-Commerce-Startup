-- CreateEnum
CREATE TYPE "GstRegistrationType" AS ENUM ('REGULAR', 'COMPOSITION', 'UNREGISTERED', 'OVERSEAS', 'GOVERNMENT_BODY');

-- CreateEnum
CREATE TYPE "GstVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED', 'EXEMPT_DECLARED');

-- CreateEnum
CREATE TYPE "TaxCategory" AS ENUM ('TAXABLE', 'EXEMPT', 'NIL_RATED', 'NON_GST');

-- CreateEnum
CREATE TYPE "TaxInclusionMode" AS ENUM ('EXCLUSIVE', 'INCLUSIVE');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'CREDIT_NOTE', 'DEBIT_NOTE');

-- CreateEnum
CREATE TYPE "InvoiceIssuer" AS ENUM ('SELLER', 'PLATFORM_OPERATOR');

-- AlterTable
ALTER TABLE "cities" ALTER COLUMN "isActive" SET DEFAULT false,
ALTER COLUMN "allowCustomerBrowsing" SET DEFAULT false,
ALTER COLUMN "allowCustomerOrdering" SET DEFAULT false,
ALTER COLUMN "allowSellerRegistration" SET DEFAULT false,
ALTER COLUMN "allowShopCreation" SET DEFAULT false,
ALTER COLUMN "isCustomerEnabled" SET DEFAULT false,
ALTER COLUMN "isDeliveryEnabled" SET DEFAULT false,
ALTER COLUMN "isSellerEnabled" SET DEFAULT false,
ALTER COLUMN "launchStatus" SET DEFAULT 'COMING_SOON';

-- AlterTable
ALTER TABLE "city_towns" ALTER COLUMN "isActive" SET DEFAULT false,
ALTER COLUMN "launchStatus" SET DEFAULT 'COMING_SOON';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cgstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "hsnCode" VARCHAR(10),
ADD COLUMN     "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "igstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "isTaxInclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sgstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxableValue" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "gstBreakdownSnapshot" JSONB,
ADD COLUMN     "isInterState" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "placeOfSupplyCode" VARCHAR(2),
ADD COLUMN     "placeOfSupplyState" VARCHAR(100),
ADD COLUMN     "platformFeeCgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "platformFeeIgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "platformFeeSgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "productCgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "productIgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "productSgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "hsnCode" VARCHAR(10),
ADD COLUMN     "isTaxInclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxCategory" "TaxCategory" DEFAULT 'TAXABLE',
ADD COLUMN     "taxRate" DECIMAL(5,2),
ADD COLUMN     "taxReviewStatus" VARCHAR(30) NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "seller_orders" ADD COLUMN     "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "commissionGstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceNumber" VARCHAR(50),
ADD COLUMN     "isInterState" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tcsCgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tcsIgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tcsSgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalTcsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "service_areas" ALTER COLUMN "isActive" SET DEFAULT false,
ALTER COLUMN "deliveryEligible" SET DEFAULT false;

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "gstRegistrationType" "GstRegistrationType" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "gstState" VARCHAR(100),
ADD COLUMN     "gstStateCode" VARCHAR(2),
ADD COLUMN     "gstVerificationStatus" "GstVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "taxInvoiceResponsibility" VARCHAR(50) NOT NULL DEFAULT 'SELLER';

-- CreateTable
CREATE TABLE "business_gst_registrations" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "legalName" VARCHAR(255) NOT NULL DEFAULT 'AtlasBasket Technologies Private Limited',
    "tradeName" VARCHAR(255) DEFAULT 'AtlasBasket',
    "gstin" VARCHAR(15),
    "pan" VARCHAR(10),
    "registrationType" "GstRegistrationType" NOT NULL DEFAULT 'REGULAR',
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "state" VARCHAR(100) NOT NULL DEFAULT 'Karnataka',
    "stateCode" VARCHAR(2) NOT NULL DEFAULT '29',
    "registeredAddress" TEXT DEFAULT 'No. 42, Innovation Hub, Outer Ring Road, Bengaluru, Karnataka, India',
    "principalPlaceOfBusiness" TEXT DEFAULT 'Bengaluru, Karnataka',
    "additionalPlacesOfBusiness" JSONB,
    "authorizedSignatoryName" VARCHAR(200),
    "authorizedSignatoryDesignation" VARCHAR(100),
    "verificationStatus" "GstVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "certificateUrl" VARCHAR(2048),
    "registrationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_gst_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_master_configs" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isMandatoryTcsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultProductTaxMode" "TaxInclusionMode" NOT NULL DEFAULT 'EXCLUSIVE',
    "defaultPlatformFeeSac" VARCHAR(10) NOT NULL DEFAULT '998319',
    "platformFeeGstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "platformFeeTaxMode" "TaxInclusionMode" NOT NULL DEFAULT 'EXCLUSIVE',
    "defaultCommissionSac" VARCHAR(10) NOT NULL DEFAULT '996111',
    "commissionGstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "deliveryServiceSac" VARCHAR(10) NOT NULL DEFAULT '996813',
    "deliveryGstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "tcsIntraStateCgstRate" DECIMAL(5,3) NOT NULL DEFAULT 0.25,
    "tcsIntraStateSgstRate" DECIMAL(5,3) NOT NULL DEFAULT 0.25,
    "tcsInterStateIgstRate" DECIMAL(5,3) NOT NULL DEFAULT 0.50,
    "tcsThresholdAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isSection9_5Applicable" BOOLEAN NOT NULL DEFAULT false,
    "section9_5Services" JSONB,
    "invoicePrefixSeller" VARCHAR(20) NOT NULL DEFAULT 'INV-SEL-',
    "invoicePrefixPlatform" VARCHAR(20) NOT NULL DEFAULT 'INV-AB-',
    "creditNotePrefix" VARCHAR(20) NOT NULL DEFAULT 'CN-AB-',
    "lastUpdatedByAdminId" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_master_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hsn_rate_masters" (
    "id" TEXT NOT NULL,
    "hsnCode" VARCHAR(10) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "taxCategory" "TaxCategory" NOT NULL DEFAULT 'TAXABLE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "notificationRef" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hsn_rate_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_tcs_ledgers" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerOrderId" TEXT,
    "orderId" TEXT,
    "transactionType" VARCHAR(30) NOT NULL DEFAULT 'COLLECTION',
    "taxPeriodMonth" VARCHAR(7) NOT NULL,
    "taxableSupplyValue" DECIMAL(12,2) NOT NULL,
    "isInterState" BOOLEAN NOT NULL DEFAULT false,
    "placeOfSupplyStateCode" VARCHAR(2) NOT NULL,
    "cgstTcsRate" DECIMAL(5,3) NOT NULL DEFAULT 0,
    "cgstTcsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgstTcsRate" DECIMAL(5,3) NOT NULL DEFAULT 0,
    "sgstTcsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igstTcsRate" DECIMAL(5,3) NOT NULL DEFAULT 0,
    "igstTcsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalTcsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remittedStatus" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "remittedAt" TIMESTAMP(3),
    "gstr8ReturnRef" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_tcs_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL DEFAULT 'TAX_INVOICE',
    "invoiceIssuer" "InvoiceIssuer" NOT NULL DEFAULT 'SELLER',
    "orderId" TEXT,
    "sellerOrderId" TEXT,
    "sellerId" TEXT,
    "customerId" TEXT,
    "supplierLegalName" VARCHAR(255) NOT NULL,
    "supplierTradeName" VARCHAR(255),
    "supplierGstin" VARCHAR(15),
    "supplierAddress" TEXT,
    "supplierState" VARCHAR(100) NOT NULL,
    "supplierStateCode" VARCHAR(2) NOT NULL,
    "recipientName" VARCHAR(255) NOT NULL,
    "recipientGstin" VARCHAR(15),
    "recipientAddress" TEXT,
    "recipientState" VARCHAR(100) NOT NULL,
    "recipientStateCode" VARCHAR(2) NOT NULL,
    "placeOfSupplyState" VARCHAR(100) NOT NULL,
    "placeOfSupplyCode" VARCHAR(2) NOT NULL,
    "isInterState" BOOLEAN NOT NULL DEFAULT false,
    "taxableAmount" DECIMAL(12,2) NOT NULL,
    "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cessAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalTaxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalInvoiceValue" DECIMAL(12,2) NOT NULL,
    "ecommerceOperatorGstin" VARCHAR(15),
    "isReverseCharge" BOOLEAN NOT NULL DEFAULT false,
    "pdfDocumentUrl" VARCHAR(2048),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemDescription" VARCHAR(300) NOT NULL,
    "hsnOrSacCode" VARCHAR(10) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableValue" DECIMAL(12,2) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "cgstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "gst_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_catalogues" (
    "id" TEXT NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "cityTown" VARCHAR(100) NOT NULL,
    "serviceArea" VARCHAR(100),
    "postalCode" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_catalogues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hsn_rate_masters_hsnCode_idx" ON "hsn_rate_masters"("hsnCode");

-- CreateIndex
CREATE INDEX "hsn_rate_masters_isActive_idx" ON "hsn_rate_masters"("isActive");

-- CreateIndex
CREATE INDEX "gst_tcs_ledgers_sellerId_idx" ON "gst_tcs_ledgers"("sellerId");

-- CreateIndex
CREATE INDEX "gst_tcs_ledgers_taxPeriodMonth_idx" ON "gst_tcs_ledgers"("taxPeriodMonth");

-- CreateIndex
CREATE INDEX "gst_tcs_ledgers_remittedStatus_idx" ON "gst_tcs_ledgers"("remittedStatus");

-- CreateIndex
CREATE UNIQUE INDEX "gst_invoices_invoiceNumber_key" ON "gst_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "gst_invoices_invoiceNumber_idx" ON "gst_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "gst_invoices_orderId_idx" ON "gst_invoices"("orderId");

-- CreateIndex
CREATE INDEX "gst_invoices_sellerOrderId_idx" ON "gst_invoices"("sellerOrderId");

-- CreateIndex
CREATE INDEX "gst_invoices_sellerId_idx" ON "gst_invoices"("sellerId");

-- CreateIndex
CREATE INDEX "gst_invoices_customerId_idx" ON "gst_invoices"("customerId");

-- CreateIndex
CREATE INDEX "gst_invoices_createdAt_idx" ON "gst_invoices"("createdAt");

-- CreateIndex
CREATE INDEX "gst_invoice_items_invoiceId_idx" ON "gst_invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "location_catalogues_state_district_idx" ON "location_catalogues"("state", "district");

-- CreateIndex
CREATE INDEX "location_catalogues_district_cityTown_idx" ON "location_catalogues"("district", "cityTown");

-- CreateIndex
CREATE INDEX "location_catalogues_postalCode_idx" ON "location_catalogues"("postalCode");

-- AddForeignKey
ALTER TABLE "gst_tcs_ledgers" ADD CONSTRAINT "gst_tcs_ledgers_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_invoice_items" ADD CONSTRAINT "gst_invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "gst_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
