-- CreateEnum
CREATE TYPE "Network" AS ENUM ('mainnet', 'ghostnet');

-- CreateEnum
CREATE TYPE "ContractVersion" AS ENUM ('v1', 'v2a', 'v2b', 'v2c', 'v2d', 'v2e', 'v3', 'v4', 'unknown');

-- CreateEnum
CREATE TYPE "AddressRole" AS ENUM ('collaborator', 'parent', 'child');

-- CreateTable
CREATE TABLE "zero_contracts" (
    "id" SERIAL NOT NULL,
    "kt1" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "version" "ContractVersion" NOT NULL DEFAULT 'unknown',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zero_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" SERIAL NOT NULL,
    "kt1" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "version" "ContractVersion" NOT NULL DEFAULT 'unknown',
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logo_uri" TEXT,
    "metadata" JSONB,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "collaboratorCount" INTEGER NOT NULL DEFAULT 0,
    "metadata_bigmap_id" INTEGER,
    "token_metadata_bigmap_id" INTEGER,
    "extrauri_counters_bigmap_id" INTEGER,
    "last_seen_lvl" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" SERIAL NOT NULL,
    "collection_id" INTEGER NOT NULL,
    "token_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "artifact_uri" TEXT,
    "mime_type" TEXT,
    "attributes" JSONB,
    "royalties" INTEGER,
    "extra_metadata" JSONB,
    "burned" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_lvl" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborators" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "role" "AddressRole" NOT NULL DEFAULT 'collaborator',
    "collection_id" INTEGER NOT NULL,

    CONSTRAINT "collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_cursor" (
    "id" SERIAL NOT NULL,
    "network" "Network" NOT NULL,
    "level" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_cursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zero_contracts_network_kt1_key" ON "zero_contracts"("network", "kt1");

-- CreateIndex
CREATE UNIQUE INDEX "collections_network_kt1_key" ON "collections"("network", "kt1");

-- CreateIndex
CREATE INDEX "tokens_collection_id_idx" ON "tokens"("collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_collection_id_token_id_key" ON "tokens"("collection_id", "token_id");

-- CreateIndex
CREATE INDEX "collaborators_address_idx" ON "collaborators"("address");

-- CreateIndex
CREATE UNIQUE INDEX "collaborators_collection_id_role_address_key" ON "collaborators"("collection_id", "role", "address");

-- CreateIndex
CREATE UNIQUE INDEX "sync_cursor_network_key" ON "sync_cursor"("network");

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
