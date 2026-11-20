
-- ==============================================================================
-- V3 MARKETPLACE OPS: ENUMS, TABLES, AND ALTERATIONS
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'MORE_INFO_REQUESTED', 'UPHELD', 'OVERTURNED', 'PARTIALLY_UPHELD', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "CaseReportStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'INVESTIGATING', 'ACTION_TAKEN', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "CommissionPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ConversationType" AS ENUM ('CUSTOMER_ADMIN', 'SELLER_ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "DeliveryMode" AS ENUM ('PLATFORM', 'SELF');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "EnforcementStatus" AS ENUM ('ISSUED', 'UNDER_APPEAL', 'UPHELD', 'OVERTURNED', 'WITHDRAWN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "EnforcementType" AS ENUM ('WARNING', 'STRIKE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "GuidelineStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'RETIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "PackingFeeApprovalStatus" AS ENUM ('NOT_APPROVED', 'PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "PolicyNoticeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "PostmortemStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ReportTargetType" AS ENUM ('SELLER', 'SHOP', 'PRODUCT', 'ORDER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ShopAgreementStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED', 'SUPERSEDED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ShopApprovalRequestStatus" AS ENUM ('PENDING_REVIEW', 'AGREEMENT_ISSUED', 'AGREEMENT_ACCEPTED', 'AGREEMENT_DECLINED', 'AWAITING_FINAL_APPROVAL', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "StatementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "SuspensionType" AS ENUM ('THREE_STRIKES', 'DIRECT_ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "MessageSenderType" AS ENUM ('CUSTOMER', 'SELLER', 'ADMIN', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Alter existing Enums
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SELLER_WARNING_ISSUED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SELLER_SUSPENDED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SELLER_REINSTATED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'APPEAL_REVIEWED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'GUIDELINE_PUBLISHED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'POLICY_NOTICE_PUBLISHED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'COMMISSION_STATEMENT_PUBLISHED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'COMMISSION_PAYMENT_RECORDED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'CASE_REPORT_RESOLVED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'POSTMORTEM_CREATED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'POSTMORTEM_UPDATED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SHOP_AGREEMENT_ISSUED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SHOP_AGREEMENT_SUPERSEDED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SHOP_APPROVAL_REQUEST_SUBMITTED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SHOP_APPROVAL_REQUEST_REVIEWED';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PACKING_FEE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PACKING_FEE_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SELLER_WARNING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SELLER_STRIKE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SELLER_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SELLER_REINSTATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'APPEAL_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_GUIDELINE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_POLICY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMISSION_STATEMENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHOP_APPROVAL_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHOP_AGREEMENT_ISSUED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHOP_AGREEMENT_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHOP_AGREEMENT_DECLINED';

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_CONFIRMATION';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PENDING_COD';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PAID';

-- 3. Alter existing tables
ALTER TABLE "seller_strikes"
  ADD COLUMN IF NOT EXISTS "evidenceUrls" text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "guidelineClause" character varying(100),
  ADD COLUMN IF NOT EXISTS "guidelineVersion" character varying(50),
  ADD COLUMN IF NOT EXISTS "reference" character varying(40),
  ADD COLUMN IF NOT EXISTS "relatedReportId" character varying(40),
  ADD COLUMN IF NOT EXISTS "status" "EnforcementStatus" NOT NULL DEFAULT 'ISSUED',
  ADD COLUMN IF NOT EXISTS "type" "EnforcementType" NOT NULL DEFAULT 'STRIKE';

CREATE UNIQUE INDEX IF NOT EXISTS "seller_strikes_reference_key" ON "seller_strikes"("reference");
CREATE INDEX IF NOT EXISTS "seller_strikes_sellerId_type_status_idx" ON "seller_strikes"("sellerId", "type", "status");
CREATE INDEX IF NOT EXISTS "seller_strikes_status_idx" ON "seller_strikes"("status");
CREATE INDEX IF NOT EXISTS "seller_strikes_type_idx" ON "seller_strikes"("type");

ALTER TABLE "shops"
  ADD COLUMN IF NOT EXISTS "commissionNotes" text,
  ADD COLUMN IF NOT EXISTS "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'PLATFORM',
  ADD COLUMN IF NOT EXISTS "packingFeeAmount" numeric(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS "packingFeeApprovalStatus" "PackingFeeApprovalStatus" NOT NULL DEFAULT 'NOT_APPROVED',
  ADD COLUMN IF NOT EXISTS "packingFeeApprovedAt" timestamp(3) without time zone,
  ADD COLUMN IF NOT EXISTS "packingFeeEnabled" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "packingFeeRejectedReason" text,
  ADD COLUMN IF NOT EXISTS "packingFeeRequestedAt" timestamp(3) without time zone,
  ADD COLUMN IF NOT EXISTS "reviewedByAdminId" character varying(30);

DO $$ BEGIN
  ALTER TABLE "shops" ADD CONSTRAINT "shops_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "paymentMethod" character varying(50),
  ADD COLUMN IF NOT EXISTS "selectedDeliveryMethod" character varying(50);

ALTER TABLE "seller_orders"
  ADD COLUMN IF NOT EXISTS "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'PLATFORM',
  ADD COLUMN IF NOT EXISTS "paymentMethod" character varying(50),
  ADD COLUMN IF NOT EXISTS "selectedDeliveryMethod" character varying(50);

CREATE INDEX IF NOT EXISTS "seller_addresses_latitude_longitude_idx" ON "seller_addresses"("latitude", "longitude");

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg13+2)




--
-- Name: appeal_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appeal_events (
    id text NOT NULL,
    "appealId" text NOT NULL,
    "actorType" character varying(20) NOT NULL,
    "actorId" character varying(40) NOT NULL,
    "eventType" character varying(50) NOT NULL,
    note text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: commission_statement_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_statement_access (
    id text NOT NULL,
    "statementId" text NOT NULL,
    "sellerId" text NOT NULL,
    "accessedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: commission_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_statements (
    id text NOT NULL,
    "statementNumber" character varying(50) NOT NULL,
    "sellerId" text NOT NULL,
    "periodMonth" character varying(7) NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    title character varying(255) NOT NULL,
    status public."StatementStatus" DEFAULT 'DRAFT'::public."StatementStatus" NOT NULL,
    "eligibleOrdersCount" integer DEFAULT 0 NOT NULL,
    "eligibleOrderIds" text[] DEFAULT ARRAY[]::text[],
    "commissionableBase" numeric(12,2) DEFAULT 0 NOT NULL,
    "applicableRate" double precision DEFAULT 10.0 NOT NULL,
    "commissionAccrued" numeric(12,2) DEFAULT 0 NOT NULL,
    adjustments numeric(12,2) DEFAULT 0 NOT NULL,
    "paymentsReceived" numeric(12,2) DEFAULT 0 NOT NULL,
    "outstandingBalance" numeric(12,2) DEFAULT 0 NOT NULL,
    "documentUrl" character varying(2048),
    notes text,
    "publishedAt" timestamp(3) without time zone,
    "publishedByAdminId" character varying(40),
    "supersededById" character varying(40),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: community_guidelines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_guidelines (
    id text NOT NULL,
    version character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    status public."GuidelineStatus" DEFAULT 'DRAFT'::public."GuidelineStatus" NOT NULL,
    "targetAudience" character varying(100) DEFAULT 'ALL_SELLERS'::character varying NOT NULL,
    sections jsonb NOT NULL,
    "requiresAcceptance" boolean DEFAULT true NOT NULL,
    "contentHash" character varying(128),
    "effectiveDate" timestamp(3) without time zone,
    "publishedAt" timestamp(3) without time zone,
    "publishedByAdminId" character varying(40),
    "createdByAdminId" character varying(40),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: conversation_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_messages (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "senderType" public."MessageSenderType" DEFAULT 'CUSTOMER'::public."MessageSenderType" NOT NULL,
    "senderId" character varying(50) NOT NULL,
    "senderName" character varying(120),
    message text NOT NULL,
    attachments text[] DEFAULT ARRAY[]::text[],
    "clientMessageId" character varying(80),
    "isInternal" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: conversation_read_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_read_receipts (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "readerType" character varying(20) NOT NULL,
    "readerId" character varying(50) NOT NULL,
    "lastReadAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id text NOT NULL,
    type public."ConversationType" DEFAULT 'CUSTOMER_ADMIN'::public."ConversationType" NOT NULL,
    "customerId" text,
    "sellerId" text,
    subject character varying(255),
    status public."ConversationStatus" DEFAULT 'OPEN'::public."ConversationStatus" NOT NULL,
    priority public."SupportTicketPriority" DEFAULT 'MEDIUM'::public."SupportTicketPriority" NOT NULL,
    "assignedAdminId" character varying(40),
    "relatedEntityType" character varying(50),
    "relatedEntityId" character varying(50),
    "internalNotes" text,
    "lastMessageAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: customer_case_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_case_reports (
    id text NOT NULL,
    "reportNumber" character varying(50) NOT NULL,
    "customerId" text NOT NULL,
    "targetType" public."ReportTargetType" DEFAULT 'SELLER'::public."ReportTargetType" NOT NULL,
    "targetId" character varying(50) NOT NULL,
    category character varying(100) NOT NULL,
    reason text NOT NULL,
    description text NOT NULL,
    attachments text[] DEFAULT ARRAY[]::text[],
    status public."CaseReportStatus" DEFAULT 'PENDING'::public."CaseReportStatus" NOT NULL,
    priority public."SupportTicketPriority" DEFAULT 'MEDIUM'::public."SupportTicketPriority" NOT NULL,
    "assignedAdminId" character varying(40),
    resolution text,
    "internalNotes" text,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: delivery_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_methods (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    enabled boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: marketplace_policy_notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_policy_notices (
    id text NOT NULL,
    title character varying(255) NOT NULL,
    category character varying(80) NOT NULL,
    content text NOT NULL,
    "effectiveDate" timestamp(3) without time zone NOT NULL,
    audience character varying(100) DEFAULT 'ALL_SELLERS'::character varying NOT NULL,
    status public."PolicyNoticeStatus" DEFAULT 'DRAFT'::public."PolicyNoticeStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "publishedByAdminId" character varying(40),
    "createdByAdminId" character varying(40),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_methods (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    enabled boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: policy_notice_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_notice_reads (
    id text NOT NULL,
    "noticeId" text NOT NULL,
    "sellerId" text NOT NULL,
    "readAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: postmortem_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.postmortem_reports (
    id text NOT NULL,
    reference character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    summary text NOT NULL,
    severity character varying(20) DEFAULT 'SEV2'::character varying NOT NULL,
    "relatedType" character varying(50),
    "relatedId" character varying(50),
    "startTime" timestamp(3) without time zone NOT NULL,
    "detectionTime" timestamp(3) without time zone NOT NULL,
    "resolutionTime" timestamp(3) without time zone,
    impact text NOT NULL,
    timeline jsonb NOT NULL,
    "rootCause" text NOT NULL,
    "contributingFactors" text NOT NULL,
    resolution text NOT NULL,
    "correctiveActions" jsonb NOT NULL,
    "preventiveActions" text NOT NULL,
    "responsibleOwner" character varying(120) NOT NULL,
    "reviewStatus" public."PostmortemStatus" DEFAULT 'DRAFT'::public."PostmortemStatus" NOT NULL,
    "approvedByAdminId" character varying(40),
    "createdByAdminId" character varying(40),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: report_timeline_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_timeline_events (
    id text NOT NULL,
    "reportId" text NOT NULL,
    "actorType" character varying(20) NOT NULL,
    "actorId" character varying(40) NOT NULL,
    "eventType" character varying(50) NOT NULL,
    note text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: seller_appeals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_appeals (
    id text NOT NULL,
    reference character varying(40) NOT NULL,
    "sellerId" text NOT NULL,
    "enforcementId" text NOT NULL,
    status public."AppealStatus" DEFAULT 'PENDING'::public."AppealStatus" NOT NULL,
    "sellerExplanation" text NOT NULL,
    "sellerAttachments" text[] DEFAULT ARRAY[]::text[],
    "orderId" character varying(40),
    "reportId" character varying(40),
    deadline timestamp(3) without time zone,
    "assignedAdminId" character varying(40),
    "decisionReason" text,
    "decidedByAdminId" character varying(40),
    "decidedAt" timestamp(3) without time zone,
    "internalNotes" text,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: seller_commission_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_commission_payments (
    id text NOT NULL,
    "sellerId" text NOT NULL,
    "statementId" text,
    amount numeric(12,2) NOT NULL,
    status public."CommissionPaymentStatus" DEFAULT 'PENDING'::public."CommissionPaymentStatus" NOT NULL,
    "paymentMethod" character varying(50) DEFAULT 'BANK_TRANSFER'::character varying NOT NULL,
    "transactionReference" character varying(100),
    notes text,
    "confirmedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: seller_guideline_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_guideline_agreements (
    id text NOT NULL,
    "sellerId" text NOT NULL,
    "guidelineId" text NOT NULL,
    "guidelineVersion" character varying(50) NOT NULL,
    "documentHash" character varying(128) NOT NULL,
    "legalName" character varying(200) NOT NULL,
    "ipAddress" character varying(45),
    "userAgent" character varying(512),
    "signatureImageUrl" character varying(2048),
    "acceptedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: seller_suspensions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_suspensions (
    id text NOT NULL,
    "sellerId" text NOT NULL,
    type public."SuspensionType" DEFAULT 'THREE_STRIKES'::public."SuspensionType" NOT NULL,
    reason text NOT NULL,
    "suspendedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reinstatedAt" timestamp(3) without time zone,
    "reinstatementReason" text,
    "adminId" text,
    "reinstatedByAdminId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: shop_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_agreements (
    id text NOT NULL,
    "shopId" text NOT NULL,
    "sellerId" text NOT NULL,
    "approvalRequestId" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    title character varying(255) NOT NULL,
    "templateId" character varying(100),
    "templateVersion" character varying(50),
    content text NOT NULL,
    "documentHash" character varying(128),
    "commissionPercentage" double precision DEFAULT 10.0 NOT NULL,
    "commissionNotes" text,
    "customerDeliveryShare" integer DEFAULT 75 NOT NULL,
    "sellerDeliveryShare" integer DEFAULT 25 NOT NULL,
    "deliveryObligations" text,
    "sellerObligations" text,
    "customTerms" jsonb,
    status public."ShopAgreementStatus" DEFAULT 'ISSUED'::public."ShopAgreementStatus" NOT NULL,
    "issuedByAdminId" character varying(30),
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "effectiveDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "acceptedAt" timestamp(3) without time zone,
    "acceptedLegalName" character varying(200),
    "acceptanceMethod" character varying(100) DEFAULT 'ELECTRONIC_SIGNATURE'::character varying,
    "ipAddress" character varying(45),
    "userAgent" character varying(512),
    "signatureImageUrl" character varying(2048),
    "declinedAt" timestamp(3) without time zone,
    "declinedReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: shop_approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_approval_requests (
    id text NOT NULL,
    "shopId" text NOT NULL,
    "sellerId" text NOT NULL,
    status public."ShopApprovalRequestStatus" DEFAULT 'PENDING_REVIEW'::public."ShopApprovalRequestStatus" NOT NULL,
    notes text,
    "rejectionReason" text,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedByAdminId" character varying(30),
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: appeal_events appeal_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appeal_events
    ADD CONSTRAINT appeal_events_pkey PRIMARY KEY (id);


--
-- Name: commission_statement_access commission_statement_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_statement_access
    ADD CONSTRAINT commission_statement_access_pkey PRIMARY KEY (id);


--
-- Name: commission_statements commission_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_statements
    ADD CONSTRAINT commission_statements_pkey PRIMARY KEY (id);


--
-- Name: community_guidelines community_guidelines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_guidelines
    ADD CONSTRAINT community_guidelines_pkey PRIMARY KEY (id);


--
-- Name: conversation_messages conversation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_messages
    ADD CONSTRAINT conversation_messages_pkey PRIMARY KEY (id);


--
-- Name: conversation_read_receipts conversation_read_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_read_receipts
    ADD CONSTRAINT conversation_read_receipts_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: customer_case_reports customer_case_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_case_reports
    ADD CONSTRAINT customer_case_reports_pkey PRIMARY KEY (id);


--
-- Name: delivery_methods delivery_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_methods
    ADD CONSTRAINT delivery_methods_pkey PRIMARY KEY (id);


--
-- Name: marketplace_policy_notices marketplace_policy_notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_policy_notices
    ADD CONSTRAINT marketplace_policy_notices_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: policy_notice_reads policy_notice_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_notice_reads
    ADD CONSTRAINT policy_notice_reads_pkey PRIMARY KEY (id);


--
-- Name: postmortem_reports postmortem_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postmortem_reports
    ADD CONSTRAINT postmortem_reports_pkey PRIMARY KEY (id);


--
-- Name: report_timeline_events report_timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_timeline_events
    ADD CONSTRAINT report_timeline_events_pkey PRIMARY KEY (id);


--
-- Name: seller_appeals seller_appeals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_appeals
    ADD CONSTRAINT seller_appeals_pkey PRIMARY KEY (id);


--
-- Name: seller_commission_payments seller_commission_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_commission_payments
    ADD CONSTRAINT seller_commission_payments_pkey PRIMARY KEY (id);


--
-- Name: seller_guideline_agreements seller_guideline_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_guideline_agreements
    ADD CONSTRAINT seller_guideline_agreements_pkey PRIMARY KEY (id);


--
-- Name: seller_suspensions seller_suspensions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_suspensions
    ADD CONSTRAINT seller_suspensions_pkey PRIMARY KEY (id);


--
-- Name: shop_agreements shop_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_agreements
    ADD CONSTRAINT shop_agreements_pkey PRIMARY KEY (id);


--
-- Name: shop_approval_requests shop_approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_approval_requests
    ADD CONSTRAINT shop_approval_requests_pkey PRIMARY KEY (id);


--
-- Name: appeal_events_appealId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "appeal_events_appealId_idx" ON public.appeal_events USING btree ("appealId");


--
-- Name: appeal_events_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "appeal_events_createdAt_idx" ON public.appeal_events USING btree ("createdAt");


--
-- Name: commission_statement_access_sellerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "commission_statement_access_sellerId_idx" ON public.commission_statement_access USING btree ("sellerId");


--
-- Name: commission_statement_access_statementId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "commission_statement_access_statementId_idx" ON public.commission_statement_access USING btree ("statementId");


--
-- Name: commission_statements_periodMonth_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "commission_statements_periodMonth_idx" ON public.commission_statements USING btree ("periodMonth");


--
-- Name: commission_statements_publishedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "commission_statements_publishedAt_idx" ON public.commission_statements USING btree ("publishedAt");


--
-- Name: commission_statements_sellerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "commission_statements_sellerId_idx" ON public.commission_statements USING btree ("sellerId");


--
-- Name: commission_statements_statementNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "commission_statements_statementNumber_key" ON public.commission_statements USING btree ("statementNumber");


--
-- Name: commission_statements_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commission_statements_status_idx ON public.commission_statements USING btree (status);


--
-- Name: community_guidelines_effectiveDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "community_guidelines_effectiveDate_idx" ON public.community_guidelines USING btree ("effectiveDate");


--
-- Name: community_guidelines_publishedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "community_guidelines_publishedAt_idx" ON public.community_guidelines USING btree ("publishedAt");


--
-- Name: community_guidelines_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX community_guidelines_status_idx ON public.community_guidelines USING btree (status);


--
-- Name: community_guidelines_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX community_guidelines_version_key ON public.community_guidelines USING btree (version);


--
-- Name: conversation_messages_clientMessageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conversation_messages_clientMessageId_idx" ON public.conversation_messages USING btree ("clientMessageId");


--
-- Name: conversation_messages_conversationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conversation_messages_conversationId_idx" ON public.conversation_messages USING btree ("conversationId");


--
-- Name: conversation_messages_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conversation_messages_createdAt_idx" ON public.conversation_messages USING btree ("createdAt");


--
-- Name: conversation_messages_senderType_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conversation_messages_senderType_senderId_idx" ON public.conversation_messages USING btree ("senderType", "senderId");


--
-- Name: conversation_read_receipts_conversationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conversation_read_receipts_conversationId_idx" ON public.conversation_read_receipts USING btree ("conversationId");


--
-- Name: conversation_read_receipts_conversationId_readerType_reader_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "conversation_read_receipts_conversationId_readerType_reader_key" ON public.conversation_read_receipts USING btree ("conversationId", "readerType", "readerId");


--
-- Name: conversations_assignedAdminId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conversations_assignedAdminId_idx" ON public.conversations USING btree ("assignedAdminId");


--
-- Name: conversations_customerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conversations_customerId_idx" ON public.conversations USING btree ("customerId");


--
--



--
-- Name: conversations_lastMessageAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conversations_lastMessageAt_idx" ON public.conversations USING btree ("lastMessageAt");


--
-- Name: conversations_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversations_priority_idx ON public.conversations USING btree (priority);


--
-- Name: conversations_sellerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "conversations_sellerId_idx" ON public.conversations USING btree ("sellerId");


--
-- Name: conversations_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversations_status_idx ON public.conversations USING btree (status);


--
-- Name: conversations_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversations_type_idx ON public.conversations USING btree (type);


--
-- Name: customer_case_reports_assignedAdminId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_case_reports_assignedAdminId_idx" ON public.customer_case_reports USING btree ("assignedAdminId");


--
-- Name: customer_case_reports_customerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_case_reports_customerId_idx" ON public.customer_case_reports USING btree ("customerId");


--
-- Name: customer_case_reports_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_case_reports_priority_idx ON public.customer_case_reports USING btree (priority);


--
-- Name: customer_case_reports_receivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_case_reports_receivedAt_idx" ON public.customer_case_reports USING btree ("receivedAt");


--
-- Name: customer_case_reports_reportNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "customer_case_reports_reportNumber_key" ON public.customer_case_reports USING btree ("reportNumber");


--
-- Name: customer_case_reports_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_case_reports_status_idx ON public.customer_case_reports USING btree (status);


--
-- Name: customer_case_reports_targetType_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "customer_case_reports_targetType_targetId_idx" ON public.customer_case_reports USING btree ("targetType", "targetId");


--
-- Name: delivery_methods_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX delivery_methods_code_key ON public.delivery_methods USING btree (code);


--
-- Name: marketplace_policy_notices_effectiveDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "marketplace_policy_notices_effectiveDate_idx" ON public.marketplace_policy_notices USING btree ("effectiveDate");


--
-- Name: marketplace_policy_notices_publishedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "marketplace_policy_notices_publishedAt_idx" ON public.marketplace_policy_notices USING btree ("publishedAt");


--
-- Name: marketplace_policy_notices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketplace_policy_notices_status_idx ON public.marketplace_policy_notices USING btree (status);


--
-- Name: payment_methods_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payment_methods_code_key ON public.payment_methods USING btree (code);


--
-- Name: policy_notice_reads_noticeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "policy_notice_reads_noticeId_idx" ON public.policy_notice_reads USING btree ("noticeId");


--
-- Name: policy_notice_reads_noticeId_sellerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "policy_notice_reads_noticeId_sellerId_key" ON public.policy_notice_reads USING btree ("noticeId", "sellerId");


--
-- Name: policy_notice_reads_sellerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "policy_notice_reads_sellerId_idx" ON public.policy_notice_reads USING btree ("sellerId");


--
-- Name: postmortem_reports_reference_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX postmortem_reports_reference_key ON public.postmortem_reports USING btree (reference);


--
-- Name: postmortem_reports_reviewStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "postmortem_reports_reviewStatus_idx" ON public.postmortem_reports USING btree ("reviewStatus");


--
-- Name: postmortem_reports_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX postmortem_reports_severity_idx ON public.postmortem_reports USING btree (severity);


--
-- Name: postmortem_reports_startTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "postmortem_reports_startTime_idx" ON public.postmortem_reports USING btree ("startTime");


--
-- Name: report_timeline_events_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "report_timeline_events_createdAt_idx" ON public.report_timeline_events USING btree ("createdAt");


--
-- Name: report_timeline_events_reportId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "report_timeline_events_reportId_idx" ON public.report_timeline_events USING btree ("reportId");


--
-- Name: seller_appeals_assignedAdminId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seller_appeals_assignedAdminId_idx" ON public.seller_appeals USING btree ("assignedAdminId");


--
-- Name: seller_appeals_enforcementId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "seller_appeals_enforcementId_key" ON public.seller_appeals USING btree ("enforcementId");


--
-- Name: seller_appeals_reference_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX seller_appeals_reference_key ON public.seller_appeals USING btree (reference);


--
-- Name: seller_appeals_sellerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seller_appeals_sellerId_idx" ON public.seller_appeals USING btree ("sellerId");


--
-- Name: seller_appeals_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seller_appeals_status_idx ON public.seller_appeals USING btree (status);


--
-- Name: seller_appeals_submittedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seller_appeals_submittedAt_idx" ON public.seller_appeals USING btree ("submittedAt");


--
-- Name: seller_commission_payments_confirmedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seller_commission_payments_confirmedAt_idx" ON public.seller_commission_payments USING btree ("confirmedAt");


--
-- Name: seller_commission_payments_sellerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seller_commission_payments_sellerId_idx" ON public.seller_commission_payments USING btree ("sellerId");


--
-- Name: seller_commission_payments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seller_commission_payments_status_idx ON public.seller_commission_payments USING btree (status);


--
-- Name: seller_guideline_agreements_acceptedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seller_guideline_agreements_acceptedAt_idx" ON public.seller_guideline_agreements USING btree ("acceptedAt");


--
-- Name: seller_guideline_agreements_guidelineId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seller_guideline_agreements_guidelineId_idx" ON public.seller_guideline_agreements USING btree ("guidelineId");


--
-- Name: seller_guideline_agreements_sellerId_guidelineId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "seller_guideline_agreements_sellerId_guidelineId_key" ON public.seller_guideline_agreements USING btree ("sellerId", "guidelineId");


--
-- Name: seller_guideline_agreements_sellerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seller_guideline_agreements_sellerId_idx" ON public.seller_guideline_agreements USING btree ("sellerId");


--
-- Name: seller_suspensions_sellerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seller_suspensions_sellerId_idx" ON public.seller_suspensions USING btree ("sellerId");


--
-- Name: seller_suspensions_suspendedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "seller_suspensions_suspendedAt_idx" ON public.seller_suspensions USING btree ("suspendedAt");


--
-- Name: seller_suspensions_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seller_suspensions_type_idx ON public.seller_suspensions USING btree (type);


--
-- Name: shop_agreements_approvalRequestId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "shop_agreements_approvalRequestId_idx" ON public.shop_agreements USING btree ("approvalRequestId");


--
-- Name: shop_agreements_issuedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "shop_agreements_issuedAt_idx" ON public.shop_agreements USING btree ("issuedAt");


--
-- Name: shop_agreements_sellerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "shop_agreements_sellerId_idx" ON public.shop_agreements USING btree ("sellerId");


--
-- Name: shop_agreements_shopId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "shop_agreements_shopId_idx" ON public.shop_agreements USING btree ("shopId");


--
-- Name: shop_agreements_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_agreements_status_idx ON public.shop_agreements USING btree (status);


--
-- Name: shop_approval_requests_sellerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "shop_approval_requests_sellerId_idx" ON public.shop_approval_requests USING btree ("sellerId");


--
-- Name: shop_approval_requests_shopId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "shop_approval_requests_shopId_idx" ON public.shop_approval_requests USING btree ("shopId");


--
-- Name: shop_approval_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_approval_requests_status_idx ON public.shop_approval_requests USING btree (status);


--
-- Name: shop_approval_requests_submittedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "shop_approval_requests_submittedAt_idx" ON public.shop_approval_requests USING btree ("submittedAt");


--
-- Name: appeal_events appeal_events_appealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appeal_events
    ADD CONSTRAINT "appeal_events_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES public.seller_appeals(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: commission_statement_access commission_statement_access_statementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_statement_access
    ADD CONSTRAINT "commission_statement_access_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES public.commission_statements(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: commission_statements commission_statements_publishedByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_statements
    ADD CONSTRAINT "commission_statements_publishedByAdminId_fkey" FOREIGN KEY ("publishedByAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: commission_statements commission_statements_sellerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_statements
    ADD CONSTRAINT "commission_statements_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES public.sellers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: community_guidelines community_guidelines_createdByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_guidelines
    ADD CONSTRAINT "community_guidelines_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: community_guidelines community_guidelines_publishedByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_guidelines
    ADD CONSTRAINT "community_guidelines_publishedByAdminId_fkey" FOREIGN KEY ("publishedByAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conversation_messages conversation_messages_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_messages
    ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversation_read_receipts conversation_read_receipts_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_read_receipts
    ADD CONSTRAINT "conversation_read_receipts_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversations conversations_assignedAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "conversations_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conversations conversations_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "conversations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
--

--
-- Name: conversations conversations_sellerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "conversations_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES public.sellers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_case_reports customer_case_reports_assignedAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_case_reports
    ADD CONSTRAINT "customer_case_reports_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: customer_case_reports customer_case_reports_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_case_reports
    ADD CONSTRAINT "customer_case_reports_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: marketplace_policy_notices marketplace_policy_notices_createdByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_policy_notices
    ADD CONSTRAINT "marketplace_policy_notices_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketplace_policy_notices marketplace_policy_notices_publishedByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_policy_notices
    ADD CONSTRAINT "marketplace_policy_notices_publishedByAdminId_fkey" FOREIGN KEY ("publishedByAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: policy_notice_reads policy_notice_reads_noticeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_notice_reads
    ADD CONSTRAINT "policy_notice_reads_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES public.marketplace_policy_notices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: policy_notice_reads policy_notice_reads_sellerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_notice_reads
    ADD CONSTRAINT "policy_notice_reads_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES public.sellers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: postmortem_reports postmortem_reports_approvedByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postmortem_reports
    ADD CONSTRAINT "postmortem_reports_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: postmortem_reports postmortem_reports_createdByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postmortem_reports
    ADD CONSTRAINT "postmortem_reports_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: report_timeline_events report_timeline_events_reportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_timeline_events
    ADD CONSTRAINT "report_timeline_events_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES public.customer_case_reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: seller_appeals seller_appeals_assignedAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_appeals
    ADD CONSTRAINT "seller_appeals_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: seller_appeals seller_appeals_decidedByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_appeals
    ADD CONSTRAINT "seller_appeals_decidedByAdminId_fkey" FOREIGN KEY ("decidedByAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: seller_appeals seller_appeals_enforcementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_appeals
    ADD CONSTRAINT "seller_appeals_enforcementId_fkey" FOREIGN KEY ("enforcementId") REFERENCES public.seller_strikes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: seller_appeals seller_appeals_sellerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_appeals
    ADD CONSTRAINT "seller_appeals_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES public.sellers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: seller_commission_payments seller_commission_payments_sellerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_commission_payments
    ADD CONSTRAINT "seller_commission_payments_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES public.sellers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: seller_commission_payments seller_commission_payments_statementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_commission_payments
    ADD CONSTRAINT "seller_commission_payments_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES public.commission_statements(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: seller_guideline_agreements seller_guideline_agreements_guidelineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_guideline_agreements
    ADD CONSTRAINT "seller_guideline_agreements_guidelineId_fkey" FOREIGN KEY ("guidelineId") REFERENCES public.community_guidelines(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: seller_guideline_agreements seller_guideline_agreements_sellerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_guideline_agreements
    ADD CONSTRAINT "seller_guideline_agreements_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES public.sellers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: seller_suspensions seller_suspensions_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_suspensions
    ADD CONSTRAINT "seller_suspensions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: seller_suspensions seller_suspensions_reinstatedByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_suspensions
    ADD CONSTRAINT "seller_suspensions_reinstatedByAdminId_fkey" FOREIGN KEY ("reinstatedByAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: seller_suspensions seller_suspensions_sellerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_suspensions
    ADD CONSTRAINT "seller_suspensions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES public.sellers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shop_agreements shop_agreements_approvalRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_agreements
    ADD CONSTRAINT "shop_agreements_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES public.shop_approval_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shop_agreements shop_agreements_issuedByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_agreements
    ADD CONSTRAINT "shop_agreements_issuedByAdminId_fkey" FOREIGN KEY ("issuedByAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: shop_agreements shop_agreements_sellerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_agreements
    ADD CONSTRAINT "shop_agreements_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES public.sellers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shop_agreements shop_agreements_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_agreements
    ADD CONSTRAINT "shop_agreements_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public.shops(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shop_approval_requests shop_approval_requests_reviewedByAdminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_approval_requests
    ADD CONSTRAINT "shop_approval_requests_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: shop_approval_requests shop_approval_requests_sellerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_approval_requests
    ADD CONSTRAINT "shop_approval_requests_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES public.sellers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shop_approval_requests shop_approval_requests_shopId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_approval_requests
    ADD CONSTRAINT "shop_approval_requests_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES public.shops(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


