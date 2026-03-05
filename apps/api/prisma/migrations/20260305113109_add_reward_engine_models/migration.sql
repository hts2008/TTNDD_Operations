-- CreateTable
CREATE TABLE "exp_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "event_type" VARCHAR(200) NOT NULL,
    "source_module" VARCHAR(100) NOT NULL,
    "action_name" VARCHAR(255) NOT NULL,
    "exp_amount" INTEGER NOT NULL,
    "max_per_day" INTEGER NOT NULL DEFAULT -1,
    "max_per_week" INTEGER NOT NULL DEFAULT -1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exp_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exp_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "transaction_type" VARCHAR(20) NOT NULL,
    "exp_amount" INTEGER NOT NULL,
    "event_type" VARCHAR(200),
    "source_module" VARCHAR(100),
    "source_entity_id" UUID,
    "deduction_reason" TEXT,
    "balance_after" INTEGER,
    "recorded_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_exp_summary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "total_exp" INTEGER NOT NULL DEFAULT 0,
    "available_exp" INTEGER NOT NULL DEFAULT 0,
    "tier_1_count" INTEGER NOT NULL DEFAULT 0,
    "tier_2_count" INTEGER NOT NULL DEFAULT 0,
    "tier_3_count" INTEGER NOT NULL DEFAULT 0,
    "tier_4_count" INTEGER NOT NULL DEFAULT 0,
    "penalty_count" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_exp_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "badge_code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "badge_type" VARCHAR(50),
    "image_url" TEXT NOT NULL,
    "rarity" VARCHAR(20) NOT NULL DEFAULT 'common',
    "trigger_event" VARCHAR(200),
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "exp_reward" INTEGER NOT NULL DEFAULT 0,
    "is_auto_award" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "badge_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_badges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "earned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_event_id" UUID,
    "notes" TEXT,

    CONSTRAINT "member_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "cost_exp" INTEGER NOT NULL,
    "category" VARCHAR(100),
    "image_url" TEXT,
    "quantity_available" INTEGER NOT NULL DEFAULT -1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_until" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "reward_id" UUID NOT NULL,
    "exp_spent" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "redeemed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "scope" VARCHAR(50) NOT NULL,
    "scope_id" UUID,
    "period" VARCHAR(50),
    "snapshot_date" DATE NOT NULL,
    "rankings" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exp_configs_org_id_event_type_key" ON "exp_configs"("org_id", "event_type");

-- CreateIndex
CREATE INDEX "exp_transactions_org_id_org_member_id_idx" ON "exp_transactions"("org_id", "org_member_id");

-- CreateIndex
CREATE INDEX "exp_transactions_org_id_created_at_idx" ON "exp_transactions"("org_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "member_exp_summary_org_member_id_key" ON "member_exp_summary"("org_member_id");

-- CreateIndex
CREATE INDEX "member_exp_summary_org_id_idx" ON "member_exp_summary"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "badge_definitions_org_id_badge_code_key" ON "badge_definitions"("org_id", "badge_code");

-- CreateIndex
CREATE INDEX "member_badges_org_id_idx" ON "member_badges"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_badges_org_member_id_badge_id_key" ON "member_badges"("org_member_id", "badge_id");

-- CreateIndex
CREATE INDEX "reward_items_org_id_idx" ON "reward_items"("org_id");

-- CreateIndex
CREATE INDEX "reward_redemptions_org_id_idx" ON "reward_redemptions"("org_id");

-- CreateIndex
CREATE INDEX "leaderboard_snapshots_org_id_scope_snapshot_date_idx" ON "leaderboard_snapshots"("org_id", "scope", "snapshot_date");

-- AddForeignKey
ALTER TABLE "exp_transactions" ADD CONSTRAINT "exp_transactions_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_exp_summary" ADD CONSTRAINT "member_exp_summary_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_badges" ADD CONSTRAINT "member_badges_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_badges" ADD CONSTRAINT "member_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "reward_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
