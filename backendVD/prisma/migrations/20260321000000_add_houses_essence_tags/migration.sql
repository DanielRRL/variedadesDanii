-- CreateTable: houses
CREATE TABLE "houses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "houses_name_key" ON "houses"("name");
CREATE UNIQUE INDEX "houses_handle_key" ON "houses"("handle");

-- AlterTable: essences — add house_id and price_per_ml
ALTER TABLE "essences" ADD COLUMN "house_id" TEXT;
ALTER TABLE "essences" ADD COLUMN "price_per_ml" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "essences" ADD CONSTRAINT "essences_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: essence_olfactive_tags (many-to-many pivot)
CREATE TABLE "essence_olfactive_tags" (
    "id" TEXT NOT NULL,
    "essence_id" TEXT NOT NULL,
    "olfactive_family_id" TEXT NOT NULL,

    CONSTRAINT "essence_olfactive_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "essence_olfactive_tags_essence_id_olfactive_family_id_key" ON "essence_olfactive_tags"("essence_id", "olfactive_family_id");

-- AddForeignKey
ALTER TABLE "essence_olfactive_tags" ADD CONSTRAINT "essence_olfactive_tags_essence_id_fkey" FOREIGN KEY ("essence_id") REFERENCES "essences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essence_olfactive_tags" ADD CONSTRAINT "essence_olfactive_tags_olfactive_family_id_fkey" FOREIGN KEY ("olfactive_family_id") REFERENCES "olfactive_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
