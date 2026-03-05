-- CreateTable
CREATE TABLE "rank_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "rank_code" VARCHAR(100) NOT NULL,
    "rank_name" VARCHAR(255) NOT NULL,
    "narrative_name" VARCHAR(255),
    "rank_order" INTEGER NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "badge_image_url" TEXT,
    "min_exp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rank_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "narrative_name" VARCHAR(255),
    "description" TEXT,
    "icon" VARCHAR(100),
    "color" VARCHAR(20),
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "skill_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "skill_group_id" UUID NOT NULL,
    "branch_id" UUID,
    "rank_id" UUID,
    "skill_code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "narrative_name" VARCHAR(255),
    "description" TEXT,
    "levels" JSONB NOT NULL,
    "max_level" INTEGER NOT NULL DEFAULT 4,
    "icon_url" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "required_for_rank_id" UUID,
    "exp_per_level" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_skill_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "current_level" INTEGER NOT NULL DEFAULT 0,
    "criteria_completed" JSONB NOT NULL DEFAULT '{}',
    "verified_levels" JSONB NOT NULL DEFAULT '{}',
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "member_skill_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_ranks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "rank_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    "started_at" DATE,
    "completed_at" DATE,
    "verified_by" UUID,
    "ceremony_date" DATE,
    "notes" TEXT,

    CONSTRAINT "member_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "session_date" DATE NOT NULL,
    "start_time" VARCHAR(10),
    "end_time" VARCHAR(10),
    "location" VARCHAR(255),
    "session_type" VARCHAR(50),
    "theme" VARCHAR(255),
    "pillar_dao_duc" TEXT,
    "pillar_phuong_phap" TEXT,
    "pillar_giao_duc" TEXT,
    "lesson_plan" JSONB,
    "materials" JSONB,
    "debrief_notes" TEXT,
    "energy_rating" INTEGER,
    "engagement_rating" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'planned',
    "created_by" UUID,
    "exp_reward" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "check_in_time" TIMESTAMPTZ,
    "check_out_time" TIMESTAMPTZ,
    "status" VARCHAR(50) NOT NULL DEFAULT 'present',
    "excused_reason" TEXT,
    "noted_by" UUID,

    CONSTRAINT "session_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_programs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "monthly_themes" JSONB,
    "objectives" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annual_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "event_type" VARCHAR(50),
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "location" VARCHAR(255),
    "max_participants" INTEGER,
    "target_branches" TEXT[],
    "schedule" JSONB,
    "raci_matrix" JSONB,
    "risk_assessment" JSONB,
    "weather_backup" TEXT,
    "emergency_plan" TEXT,
    "first_aid_officer" UUID,
    "budget" JSONB,
    "actual_cost" DECIMAL(15,2),
    "status" VARCHAR(50) NOT NULL DEFAULT 'planning',
    "registration_deadline" DATE,
    "exp_reward" INTEGER NOT NULL DEFAULT 20,
    "created_by" UUID,
    "safety_checklist" JSONB,
    "post_event_report" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'registered',
    "consent_signed" BOOLEAN NOT NULL DEFAULT false,
    "consent_date" TIMESTAMPTZ,
    "consent_by" VARCHAR(255),
    "medical_info" JSONB,
    "check_in_time" TIMESTAMPTZ,
    "check_out_time" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rank_definitions_org_id_branch_id_rank_code_key" ON "rank_definitions"("org_id", "branch_id", "rank_code");

-- CreateIndex
CREATE UNIQUE INDEX "member_skill_progress_org_member_id_skill_id_key" ON "member_skill_progress"("org_member_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_ranks_org_member_id_branch_id_rank_id_key" ON "member_ranks"("org_member_id", "branch_id", "rank_id");

-- CreateIndex
CREATE INDEX "sessions_org_id_session_date_idx" ON "sessions"("org_id", "session_date");

-- CreateIndex
CREATE UNIQUE INDEX "session_attendance_session_id_org_member_id_key" ON "session_attendance"("session_id", "org_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "annual_programs_org_id_branch_id_year_key" ON "annual_programs"("org_id", "branch_id", "year");

-- CreateIndex
CREATE INDEX "events_org_id_start_date_idx" ON "events"("org_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_event_id_org_member_id_key" ON "event_registrations"("event_id", "org_member_id");

-- AddForeignKey
ALTER TABLE "rank_definitions" ADD CONSTRAINT "rank_definitions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_skill_group_id_fkey" FOREIGN KEY ("skill_group_id") REFERENCES "skill_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_skill_progress" ADD CONSTRAINT "member_skill_progress_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_skill_progress" ADD CONSTRAINT "member_skill_progress_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_ranks" ADD CONSTRAINT "member_ranks_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_ranks" ADD CONSTRAINT "member_ranks_rank_id_fkey" FOREIGN KEY ("rank_id") REFERENCES "rank_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_attendance" ADD CONSTRAINT "session_attendance_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
