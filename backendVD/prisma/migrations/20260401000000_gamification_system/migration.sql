-- =============================================================================
-- Migration: 20260401000000_gamification_system
-- Description: Sistema de gamificacion y gramos.
--   - Nuevos enums: ProductType, GramSourceType, GameTokenStatus, GameType,
--     ChallengeStatus, EssenceRedemptionStatus
--   - Nuevos campos en products: product_type, generates_gram, stock_units, photo_url
--   - Nuevas tablas: gram_accounts, gram_transactions, game_tokens,
--     essence_redemptions, weekly_challenges, user_challenge_progresses
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CREATE ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE "ProductType" AS ENUM (
  'LOTION',
  'CREAM',
  'SHAMPOO',
  'MAKEUP',
  'SPLASH',
  'ACCESSORY',
  'ESSENCE_CATALOG'
);

CREATE TYPE "GramSourceType" AS ENUM (
  'PRODUCT_PURCHASE',
  'ESSENCE_OZ_BONUS',
  'GAME_ROULETTE',
  'GAME_PUZZLE',
  'WEEKLY_CHALLENGE',
  'MONTHLY_RANKING',
  'ADMIN_ADJUSTMENT',
  'REDEMPTION'
);

CREATE TYPE "GameTokenStatus" AS ENUM (
  'PENDING',
  'USED',
  'EXPIRED'
);

CREATE TYPE "GameType" AS ENUM (
  'ROULETTE',
  'PUZZLE'
);

CREATE TYPE "ChallengeStatus" AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'EXPIRED'
);

CREATE TYPE "EssenceRedemptionStatus" AS ENUM (
  'PENDING_DELIVERY',
  'DELIVERED',
  'CANCELLED'
);

-- ---------------------------------------------------------------------------
-- 2. ALTER TABLE products — add new columns
-- ---------------------------------------------------------------------------

ALTER TABLE "products" ADD COLUMN "product_type" "ProductType" NOT NULL DEFAULT 'LOTION';
ALTER TABLE "products" ADD COLUMN "generates_gram" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN "stock_units" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "photo_url" TEXT;

-- ---------------------------------------------------------------------------
-- 3. CREATE TABLE gram_accounts
-- ---------------------------------------------------------------------------

CREATE TABLE "gram_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_grams" INTEGER NOT NULL DEFAULT 0,
    "total_earned" INTEGER NOT NULL DEFAULT 0,
    "total_redeemed" INTEGER NOT NULL DEFAULT 0,
    "total_purchases" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gram_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gram_accounts_user_id_key" ON "gram_accounts"("user_id");

ALTER TABLE "gram_accounts"
    ADD CONSTRAINT "gram_accounts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. CREATE TABLE gram_transactions
-- ---------------------------------------------------------------------------

CREATE TABLE "gram_transactions" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "source_type" "GramSourceType" NOT NULL,
    "grams_delta" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gram_transactions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "gram_transactions"
    ADD CONSTRAINT "gram_transactions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "gram_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "gram_transactions"
    ADD CONSTRAINT "gram_transactions_reference_id_fkey"
    FOREIGN KEY ("reference_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 5. CREATE TABLE game_tokens
-- ---------------------------------------------------------------------------

CREATE TABLE "game_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "GameTokenStatus" NOT NULL DEFAULT 'PENDING',
    "game_type" "GameType",
    "grams_won" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "played_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_tokens_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "game_tokens"
    ADD CONSTRAINT "game_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 6. CREATE TABLE essence_redemptions
-- ---------------------------------------------------------------------------

CREATE TABLE "essence_redemptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "grams_used" INTEGER NOT NULL,
    "oz_redeemed" DOUBLE PRECISION NOT NULL,
    "essence_name" TEXT NOT NULL,
    "essence_id" TEXT,
    "status" "EssenceRedemptionStatus" NOT NULL DEFAULT 'PENDING_DELIVERY',
    "admin_notes" TEXT,
    "delivered_by_id" TEXT,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "essence_redemptions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "essence_redemptions"
    ADD CONSTRAINT "essence_redemptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 7. CREATE TABLE weekly_challenges
-- ---------------------------------------------------------------------------

CREATE TABLE "weekly_challenges" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "gram_reward" INTEGER NOT NULL,
    "required_purchases" INTEGER NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "week_end" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_challenges_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 8. CREATE TABLE user_challenge_progresses
-- ---------------------------------------------------------------------------

CREATE TABLE "user_challenge_progresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "purchases_count" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_challenge_progresses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_challenge_progresses_user_id_challenge_id_key"
    ON "user_challenge_progresses"("user_id", "challenge_id");

ALTER TABLE "user_challenge_progresses"
    ADD CONSTRAINT "user_challenge_progresses_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_challenge_progresses"
    ADD CONSTRAINT "user_challenge_progresses_challenge_id_fkey"
    FOREIGN KEY ("challenge_id") REFERENCES "weekly_challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 9. INDEXES for performance
-- ---------------------------------------------------------------------------

CREATE INDEX "idx_gram_accounts_user_id" ON "gram_accounts"("user_id");
CREATE INDEX "idx_game_tokens_user_status" ON "game_tokens"("user_id", "status");
CREATE INDEX "idx_essence_redemptions_user_status" ON "essence_redemptions"("user_id", "status");
