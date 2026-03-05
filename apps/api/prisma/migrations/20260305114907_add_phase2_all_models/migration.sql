-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "cover_image_url" TEXT,
    "category" VARCHAR(100),
    "difficulty" VARCHAR(20),
    "target_branches" TEXT[],
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "exp_reward" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "total_duration" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "lesson_type" VARCHAR(50),
    "content" JSONB NOT NULL DEFAULT '{}',
    "video_url" TEXT,
    "duration" INTEGER,
    "exp_reward" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "quiz_type" VARCHAR(50),
    "time_limit" INTEGER,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "randomize_q" BOOLEAN NOT NULL DEFAULT false,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "course_id" UUID,
    "exp_reward" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" VARCHAR(50),
    "options" JSONB NOT NULL,
    "correct_answer" JSONB,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "time_limit" INTEGER,
    "media_url" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_battles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "game_code" VARCHAR(10) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'waiting',
    "max_players" INTEGER NOT NULL DEFAULT 30,
    "current_question" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "results" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_course_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'not_started',
    "progress_pct" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "score" DECIMAL(5,2),
    "exp_earned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "member_course_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spiritual_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "log_date" DATE NOT NULL,
    "log_type" VARCHAR(50),
    "duration_minutes" INTEGER,
    "notes" TEXT,
    "thanh_ngon_ref" TEXT,
    "emotion_before" INTEGER,
    "emotion_after" INTEGER,
    "exp_earned" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "spiritual_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngu_gioi_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "bat_sat_sinh" INTEGER,
    "bat_du_dao" INTEGER,
    "bat_ta_dam" INTEGER,
    "bat_tuu_nhuc" INTEGER,
    "bat_vong_ngu" INTEGER,
    "reflection" TEXT,

    CONSTRAINT "ngu_gioi_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "evaluator_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "evaluation_type" VARCHAR(50),
    "score_dao_duc" INTEGER,
    "score_ky_nang" INTEGER,
    "score_the_chat" INTEGER,
    "score_lanh_dao" INTEGER,
    "score_phung_su" INTEGER,
    "strengths" TEXT,
    "areas_to_improve" TEXT,
    "recommendations" TEXT,
    "self_assessment" JSONB,
    "evaluation_date" DATE NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentoring_relationships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "mentee_id" UUID NOT NULL,
    "start_date" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',

    CONSTRAINT "mentoring_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentoring_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "relationship_id" UUID NOT NULL,
    "session_date" DATE NOT NULL,
    "topic" VARCHAR(255),
    "outcome" TEXT,
    "follow_up" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentoring_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "plan_type" VARCHAR(50),
    "section_i_description" TEXT,
    "section_ii_objectives" JSONB,
    "section_iii_outcomes" JSONB,
    "section_iv_activities" JSONB,
    "section_v_personnel" JSONB,
    "section_vi_content" JSONB,
    "section_vii_timeline" JSONB,
    "section_viii_proposal" TEXT,
    "section_ix_budget" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "submitted_by" UUID,
    "submitted_at" TIMESTAMPTZ,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "generated_project_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "project_type" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'planning',
    "source_plan_id" UUID,
    "objectives" JSONB NOT NULL DEFAULT '[]',
    "key_results" JSONB NOT NULL DEFAULT '[]',
    "owner_id" UUID,
    "start_date" DATE,
    "end_date" DATE,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'todo',
    "task_type" VARCHAR(50) NOT NULL DEFAULT 'task',
    "assignee_ids" TEXT[],
    "reporter_id" UUID,
    "start_date" DATE,
    "due_date" DATE,
    "story_points" INTEGER,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "parent_task_id" UUID,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "ticket_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "requester_id" UUID NOT NULL,
    "assignee_id" UUID,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "approval_notes" TEXT,
    "resolved_at" TIMESTAMPTZ,
    "due_date" DATE,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "from_status" VARCHAR(50),
    "to_status" VARCHAR(50) NOT NULL,
    "changed_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "account_type" VARCHAR(50),
    "branch_id" UUID,
    "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "transaction_type" VARCHAR(20) NOT NULL,
    "category" VARCHAR(100),
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "source_type" VARCHAR(50),
    "source_id" UUID,
    "description" TEXT NOT NULL,
    "recorded_by" UUID NOT NULL,
    "approved_by" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "receipt_urls" TEXT[],
    "reference_no" VARCHAR(100),
    "transaction_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_fees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "fee_type" VARCHAR(50),
    "fee_period" VARCHAR(20),
    "amount_due" DECIMAL(15,2) NOT NULL,
    "amount_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "due_date" DATE,
    "paid_date" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    "transaction_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "owner_type" VARCHAR(20),
    "branch_id" UUID,
    "icon" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "asset_code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category_id" UUID NOT NULL,
    "owner_type" VARCHAR(20) NOT NULL DEFAULT 'org',
    "branch_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'available',
    "condition" VARCHAR(50) NOT NULL DEFAULT 'good',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "available_qty" INTEGER NOT NULL DEFAULT 1,
    "unit" VARCHAR(50),
    "purchase_date" DATE,
    "purchase_price" DECIMAL(15,2),
    "serial_number" VARCHAR(100),
    "location" VARCHAR(255),
    "photo_urls" TEXT[],
    "notes" TEXT,
    "managed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_loans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "borrower_id" UUID NOT NULL,
    "purpose" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ,
    "approved_by" UUID,
    "expected_return" DATE NOT NULL,
    "actual_return" DATE,
    "condition_on_return" VARCHAR(50),
    "return_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "step_results" JSONB NOT NULL DEFAULT '[]',
    "initiated_by" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courses_org_id_idx" ON "courses"("org_id");

-- CreateIndex
CREATE INDEX "quizzes_org_id_idx" ON "quizzes"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_battles_game_code_key" ON "quiz_battles"("game_code");

-- CreateIndex
CREATE UNIQUE INDEX "member_course_progress_org_member_id_course_id_key" ON "member_course_progress"("org_member_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "spiritual_logs_org_member_id_log_date_log_type_key" ON "spiritual_logs"("org_member_id", "log_date", "log_type");

-- CreateIndex
CREATE UNIQUE INDEX "ngu_gioi_assessments_org_member_id_week_start_key" ON "ngu_gioi_assessments"("org_member_id", "week_start");

-- CreateIndex
CREATE INDEX "evaluations_org_id_org_member_id_idx" ON "evaluations"("org_id", "org_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentoring_relationships_org_id_mentor_id_mentee_id_key" ON "mentoring_relationships"("org_id", "mentor_id", "mentee_id");

-- CreateIndex
CREATE INDEX "plans_org_id_idx" ON "plans"("org_id");

-- CreateIndex
CREATE INDEX "projects_org_id_idx" ON "projects"("org_id");

-- CreateIndex
CREATE INDEX "tasks_org_id_project_id_idx" ON "tasks"("org_id", "project_id");

-- CreateIndex
CREATE INDEX "tickets_org_id_status_idx" ON "tickets"("org_id", "status");

-- CreateIndex
CREATE INDEX "financial_accounts_org_id_idx" ON "financial_accounts"("org_id");

-- CreateIndex
CREATE INDEX "financial_transactions_org_id_transaction_date_idx" ON "financial_transactions"("org_id", "transaction_date");

-- CreateIndex
CREATE INDEX "member_fees_org_id_org_member_id_idx" ON "member_fees"("org_id", "org_member_id");

-- CreateIndex
CREATE INDEX "asset_categories_org_id_idx" ON "asset_categories"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_code_key" ON "assets"("asset_code");

-- CreateIndex
CREATE INDEX "assets_org_id_idx" ON "assets"("org_id");

-- CreateIndex
CREATE INDEX "asset_loans_org_id_idx" ON "asset_loans"("org_id");

-- CreateIndex
CREATE INDEX "workflow_definitions_org_id_idx" ON "workflow_definitions"("org_id");

-- CreateIndex
CREATE INDEX "workflow_runs_org_id_idx" ON "workflow_runs"("org_id");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_battles" ADD CONSTRAINT "quiz_battles_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_course_progress" ADD CONSTRAINT "member_course_progress_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_course_progress" ADD CONSTRAINT "member_course_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spiritual_logs" ADD CONSTRAINT "spiritual_logs_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngu_gioi_assessments" ADD CONSTRAINT "ngu_gioi_assessments_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentoring_logs" ADD CONSTRAINT "mentoring_logs_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "mentoring_relationships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_fees" ADD CONSTRAINT "member_fees_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_loans" ADD CONSTRAINT "asset_loans_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
