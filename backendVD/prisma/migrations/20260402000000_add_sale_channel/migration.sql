-- CreateEnum: SaleChannel
CREATE TYPE "SaleChannel" AS ENUM ('ECOMMERCE', 'IN_STORE');

-- AlterEnum: PaymentMethod (add EFECTIVO and TRANSFERENCIA)
ALTER TYPE "PaymentMethod" ADD VALUE 'EFECTIVO';
ALTER TYPE "PaymentMethod" ADD VALUE 'TRANSFERENCIA';

-- AlterTable: orders — add sale_channel, walk_in_client, simple_invoice, invoice_number
ALTER TABLE "orders" ADD COLUMN "sale_channel" "SaleChannel" NOT NULL DEFAULT 'ECOMMERCE';
ALTER TABLE "orders" ADD COLUMN "walk_in_client" TEXT;
ALTER TABLE "orders" ADD COLUMN "simple_invoice" JSONB;
ALTER TABLE "orders" ADD COLUMN "invoice_number" TEXT;

-- AlterTable: gram_accounts — add total_in_store_purchases
ALTER TABLE "gram_accounts" ADD COLUMN "total_in_store_purchases" INTEGER NOT NULL DEFAULT 0;
