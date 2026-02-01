-- Add multi-tenant support

-- Add userId to api_keys
ALTER TABLE "api_keys" ADD COLUMN "userId" TEXT;
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- Add userId to notes
ALTER TABLE "notes" ADD COLUMN "userId" TEXT;
CREATE INDEX "notes_userId_idx" ON "notes"("userId");

-- CreateTable: connections
CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'semantic',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "connections_fromId_toId_key" ON "connections"("fromId", "toId");

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "provider" TEXT,
    "providerId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "notesCount" INTEGER NOT NULL DEFAULT 0,
    "apiCallsCount" INTEGER NOT NULL DEFAULT 0,
    "apiCallsResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_provider_providerId_key" ON "users"("provider", "providerId");
