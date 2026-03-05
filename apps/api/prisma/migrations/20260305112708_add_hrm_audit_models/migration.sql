-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resource_id" UUID,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "birth_date" DATE,
    "gender" VARCHAR(20),
    "id_card" VARCHAR(50),
    "address" TEXT,
    "photo_url" TEXT,
    "personal_phone" VARCHAR(20),
    "personal_email" VARCHAR(255),
    "zalo_id" VARCHAR(100),
    "guardian_name" VARCHAR(255),
    "guardian_phone" VARCHAR(20),
    "guardian_relation" VARCHAR(50),
    "guardian_zalo" VARCHAR(100),
    "promise_date" DATE,
    "uniform_size" VARCHAR(20),
    "health_notes" TEXT,
    "emergency_contact" TEXT,
    "wood_badge_level" VARCHAR(50),
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "join_reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_branch_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "from_branch_id" UUID,
    "to_branch_id" UUID,
    "from_unit_id" UUID,
    "to_unit_id" UUID,
    "transition_date" DATE NOT NULL,
    "reason" TEXT,
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_branch_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_chart_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "node_type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parent_node_id" UUID,
    "org_member_id" UUID,
    "position_title" VARCHAR(100),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_chart_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_org_id_action_idx" ON "audit_logs"("org_id", "action");

-- CreateIndex
CREATE INDEX "audit_logs_org_id_resource_resource_id_idx" ON "audit_logs"("org_id", "resource", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_org_id_created_at_idx" ON "audit_logs"("org_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_org_member_id_key" ON "member_profiles"("org_member_id");

-- CreateIndex
CREATE INDEX "member_profiles_org_id_idx" ON "member_profiles"("org_id");

-- CreateIndex
CREATE INDEX "member_branch_history_org_id_org_member_id_idx" ON "member_branch_history"("org_id", "org_member_id");

-- CreateIndex
CREATE INDEX "org_chart_nodes_org_id_idx" ON "org_chart_nodes"("org_id");

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_branch_history" ADD CONSTRAINT "member_branch_history_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_chart_nodes" ADD CONSTRAINT "org_chart_nodes_parent_node_id_fkey" FOREIGN KEY ("parent_node_id") REFERENCES "org_chart_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
