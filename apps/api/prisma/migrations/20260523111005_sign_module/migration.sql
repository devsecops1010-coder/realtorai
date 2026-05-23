-- CreateEnum
CREATE TYPE "SignDocumentStatus" AS ENUM ('draft', 'sent', 'viewed', 'otp_verified', 'signed', 'declined', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "WebhookEndpointStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('pending', 'delivered', 'failed', 'dead');

-- CreateTable
CREATE TABLE "sign_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "original_file_path" TEXT NOT NULL,
    "signed_file_path" TEXT,
    "document_hash" TEXT NOT NULL,
    "signed_document_hash" TEXT,
    "status" "SignDocumentStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sign_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_signature_requests" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_email" TEXT NOT NULL,
    "signer_phone" TEXT,
    "signing_token_hash" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "otp_hash" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "otp_verified_at" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "status" "SignDocumentStatus" NOT NULL DEFAULT 'sent',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sign_signature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_signatures" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "signature_request_id" TEXT NOT NULL,
    "signature_image_path" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_email" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sign_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "event_filter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "WebhookEndpointStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "endpoint_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_response_code" INTEGER,
    "last_error" TEXT,
    "next_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sign_documents_tenant_id_created_at_idx" ON "sign_documents"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "sign_documents_tenant_id_status_idx" ON "sign_documents"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sign_signature_requests_document_id_key" ON "sign_signature_requests"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "sign_signature_requests_signing_token_hash_key" ON "sign_signature_requests"("signing_token_hash");

-- CreateIndex
CREATE INDEX "sign_signature_requests_signing_token_hash_idx" ON "sign_signature_requests"("signing_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "sign_signatures_document_id_key" ON "sign_signatures"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "sign_signatures_signature_request_id_key" ON "sign_signatures"("signature_request_id");

-- CreateIndex
CREATE INDEX "webhook_endpoints_tenant_id_idx" ON "webhook_endpoints"("tenant_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_tenant_id_status_idx" ON "webhook_deliveries"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_next_attempt_at_idx" ON "webhook_deliveries"("next_attempt_at");

-- AddForeignKey
ALTER TABLE "sign_documents" ADD CONSTRAINT "sign_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_documents" ADD CONSTRAINT "sign_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_signature_requests" ADD CONSTRAINT "sign_signature_requests_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "sign_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_signatures" ADD CONSTRAINT "sign_signatures_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "sign_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_signatures" ADD CONSTRAINT "sign_signatures_signature_request_id_fkey" FOREIGN KEY ("signature_request_id") REFERENCES "sign_signature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
