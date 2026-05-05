-- CreateTable
CREATE TABLE "PaymentProcessorConfig" (
    "id" TEXT NOT NULL,
    "processor" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "secretKey" TEXT,
    "webhookSecret" TEXT,
    "publishableKey" TEXT,
    "accountId" TEXT,
    "accountName" TEXT,
    "isTestMode" BOOLEAN,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProcessorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProcessorConfig_processor_key" ON "PaymentProcessorConfig"("processor");
