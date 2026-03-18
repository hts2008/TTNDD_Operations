/*
  Warnings:

  - Made the column `question_type` on table `quiz_questions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "published_at" TIMESTAMPTZ,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "module_id" UUID;

-- AlterTable
ALTER TABLE "member_profiles" ADD COLUMN     "background_check_expiry" DATE,
ADD COLUMN     "consent_form_signed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "custom_fields" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "medical_form_date" DATE,
ADD COLUMN     "youth_protection_date" DATE;

-- AlterTable
ALTER TABLE "quiz_questions" ALTER COLUMN "question_type" SET NOT NULL,
ALTER COLUMN "question_type" SET DEFAULT 'multiple_choice';

-- AlterTable
ALTER TABLE "workflow_definitions" ADD COLUMN     "edges_json" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "nodes_json" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "triggers_json" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "current_node_id" VARCHAR(100),
ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "node_results" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "guardian_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "relation" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "zalo_id" VARCHAR(100),
    "address" TEXT,
    "id_card" VARCHAR(50),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "can_pickup" BOOLEAN NOT NULL DEFAULT true,
    "consent_signed" BOOLEAN NOT NULL DEFAULT false,
    "consent_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'not_started',
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "competency_code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_competencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "competency_id" UUID NOT NULL,

    CONSTRAINT "course_competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completion_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "rule_type" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "completion_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    "answers" JSONB NOT NULL DEFAULT '[]',
    "score" INTEGER,
    "passed" BOOLEAN,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ,
    "graded_at" TIMESTAMPTZ,
    "graded_by" UUID,
    "feedback" TEXT,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_run_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "node_id" VARCHAR(100),
    "action" VARCHAR(100) NOT NULL,
    "from_node" VARCHAR(100),
    "to_node" VARCHAR(100),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_run_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "nodes_json" JSONB NOT NULL DEFAULT '[]',
    "edges_json" JSONB NOT NULL DEFAULT '[]',
    "triggers_json" JSONB NOT NULL DEFAULT '[]',
    "is_built_in" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sop_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sop_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sop_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "change_notes" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "created_by" UUID NOT NULL,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sop_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sop_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "approver_id" UUID NOT NULL,
    "decision" VARCHAR(20) NOT NULL,
    "comments" TEXT,
    "decided_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sop_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guardian_links_org_id_idx" ON "guardian_links"("org_id");

-- CreateIndex
CREATE INDEX "guardian_links_org_member_id_idx" ON "guardian_links"("org_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_links_org_member_id_full_name_relation_key" ON "guardian_links"("org_member_id", "full_name", "relation");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_org_member_id_lesson_id_key" ON "lesson_progress"("org_member_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "competencies_org_id_competency_code_key" ON "competencies"("org_id", "competency_code");

-- CreateIndex
CREATE UNIQUE INDEX "course_competencies_course_id_competency_id_key" ON "course_competencies"("course_id", "competency_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_org_id_quiz_id_org_member_id_idx" ON "quiz_attempts"("org_id", "quiz_id", "org_member_id");

-- CreateIndex
CREATE INDEX "workflow_run_logs_run_id_created_at_idx" ON "workflow_run_logs"("run_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_templates_slug_key" ON "workflow_templates"("slug");

-- CreateIndex
CREATE INDEX "sop_documents_org_id_idx" ON "sop_documents"("org_id");

-- CreateIndex
CREATE INDEX "sop_documents_org_id_status_idx" ON "sop_documents"("org_id", "status");

-- CreateIndex
CREATE INDEX "sop_versions_org_id_idx" ON "sop_versions"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "sop_versions_document_id_version_no_key" ON "sop_versions"("document_id", "version_no");

-- CreateIndex
CREATE INDEX "sop_approvals_org_id_document_id_idx" ON "sop_approvals"("org_id", "document_id");

-- CreateIndex
CREATE INDEX "workflow_runs_org_id_status_idx" ON "workflow_runs"("org_id", "status");

-- AddForeignKey
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "course_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_competencies" ADD CONSTRAINT "course_competencies_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_competencies" ADD CONSTRAINT "course_competencies_competency_id_fkey" FOREIGN KEY ("competency_id") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completion_rules" ADD CONSTRAINT "completion_rules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run_logs" ADD CONSTRAINT "workflow_run_logs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sop_versions" ADD CONSTRAINT "sop_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "sop_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sop_approvals" ADD CONSTRAINT "sop_approvals_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "sop_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
