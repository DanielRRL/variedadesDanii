-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MUJER', 'HOMBRE', 'UNISEX');

-- AlterTable: products
ALTER TABLE "products" ADD COLUMN "gender" "Gender" NOT NULL DEFAULT 'UNISEX';

-- AlterTable: essences
ALTER TABLE "essences" ADD COLUMN "gender" "Gender" NOT NULL DEFAULT 'UNISEX';
