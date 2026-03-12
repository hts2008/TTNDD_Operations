-- M2-B: Project Views, Risks, Wiki, Checklists
-- Creates missing project module tables: project_phases, project_comments,
-- project_risks, project_checklists, task_dependencies, project_documents,
-- time_entries, cost_entries, plan_revisions, plan_templates,
-- plus additional missing tables from schema drift.

-- CreateTable
CREATE TABLE "plan_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "snapshot_data" JSONB NOT NULL,
    "change_reason" TEXT,
    "changed_by" UUID NOT NULL,
    "from_status" VARCHAR(50),
    "to_status" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "template_data" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_phases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "phase_type" VARCHAR(30) NOT NULL DEFAULT 'phase',
    "status" VARCHAR(30) NOT NULL DEFAULT 'planned',
    "parent_id" UUID,
    "start_date" DATE,
    "end_date" DATE,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: T-1035 Risk Register
CREATE TABLE "project_risks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "probability" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "mitigation" TEXT,
    "owner_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: T-1035 Checklists
CREATE TABLE "project_checklists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable: T-0141 Task Dependencies
CREATE TABLE "task_dependencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "source_task_id" UUID NOT NULL,
    "target_task_id" UUID NOT NULL,
    "dependency_type" VARCHAR(30) NOT NULL DEFAULT 'finish_to_start',
    "lag_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: T-0143 Project Documents / Wiki
CREATE TABLE "project_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "doc_type" VARCHAR(30) NOT NULL DEFAULT 'wiki',
    "parent_id" UUID,
    "author_id" UUID NOT NULL,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: T-0144 Time Entries
CREATE TABLE "time_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "user_id" UUID NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "log_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: T-0144 Cost Entries
CREATE TABLE "cost_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID,
    "category" VARCHAR(100) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "description" TEXT,
    "log_date" DATE NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_entries_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add phase_id and phase FK to tasks
ALTER TABLE "tasks" ADD COLUMN "phase_id" UUID;

-- CreateIndexes
CREATE INDEX "plan_revisions_plan_id_idx" ON "plan_revisions"("plan_id");
CREATE INDEX "plan_revisions_org_id_idx" ON "plan_revisions"("org_id");
CREATE INDEX "plan_templates_org_id_category_idx" ON "plan_templates"("org_id", "category");
CREATE INDEX "project_phases_org_id_project_id_idx" ON "project_phases"("org_id", "project_id");
CREATE INDEX "project_comments_org_id_project_id_idx" ON "project_comments"("org_id", "project_id");
CREATE INDEX "project_comments_task_id_idx" ON "project_comments"("task_id");
CREATE INDEX "project_risks_org_id_project_id_idx" ON "project_risks"("org_id", "project_id");
CREATE INDEX "project_checklists_org_id_project_id_idx" ON "project_checklists"("org_id", "project_id");
CREATE INDEX "project_checklists_task_id_idx" ON "project_checklists"("task_id");
CREATE UNIQUE INDEX "task_dependencies_source_task_id_target_task_id_key" ON "task_dependencies"("source_task_id", "target_task_id");
CREATE INDEX "task_dependencies_org_id_project_id_idx" ON "task_dependencies"("org_id", "project_id");
CREATE INDEX "project_documents_org_id_project_id_idx" ON "project_documents"("org_id", "project_id");
CREATE INDEX "time_entries_org_id_project_id_idx" ON "time_entries"("org_id", "project_id");
CREATE INDEX "time_entries_task_id_idx" ON "time_entries"("task_id");
CREATE INDEX "cost_entries_org_id_project_id_idx" ON "cost_entries"("org_id", "project_id");

-- AddForeignKeys
ALTER TABLE "plan_revisions" ADD CONSTRAINT "plan_revisions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_checklists" ADD CONSTRAINT "project_checklists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_checklists" ADD CONSTRAINT "project_checklists_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "project_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
