-- AlterTable
ALTER TABLE "asset_loans" ADD COLUMN     "checked_out_at" TIMESTAMPTZ,
ADD COLUMN     "guardian_acceptance_status" VARCHAR(30) DEFAULT 'not_required',
ADD COLUMN     "guardian_accepted_at" TIMESTAMPTZ,
ADD COLUMN     "guardian_accepted_by" UUID;

-- CreateTable
CREATE TABLE "asset_custom_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "field_name" VARCHAR(100) NOT NULL,
    "field_value" TEXT,
    "field_type" VARCHAR(30) NOT NULL DEFAULT 'text',

    CONSTRAINT "asset_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "kit_type" VARCHAR(50) NOT NULL DEFAULT 'standard',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kit_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_template_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "kit_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "maintenance_type" VARCHAR(100) NOT NULL,
    "frequency" VARCHAR(30) NOT NULL DEFAULT 'monthly',
    "next_due" DATE NOT NULL,
    "last_performed" TIMESTAMPTZ,
    "status" VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    "assigned_to" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uniform_issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "uniform_type" VARCHAR(100) NOT NULL,
    "size" VARCHAR(20) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(30) NOT NULL DEFAULT 'issued',
    "issued_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "return_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uniform_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_custom_fields_org_id_idx" ON "asset_custom_fields"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_custom_fields_asset_id_field_name_key" ON "asset_custom_fields"("asset_id", "field_name");

-- CreateIndex
CREATE INDEX "kit_templates_org_id_idx" ON "kit_templates"("org_id");

-- CreateIndex
CREATE INDEX "kit_template_items_template_id_idx" ON "kit_template_items"("template_id");

-- CreateIndex
CREATE INDEX "maintenance_schedules_org_id_idx" ON "maintenance_schedules"("org_id");

-- CreateIndex
CREATE INDEX "maintenance_schedules_org_id_status_next_due_idx" ON "maintenance_schedules"("org_id", "status", "next_due");

-- CreateIndex
CREATE INDEX "uniform_issues_org_id_idx" ON "uniform_issues"("org_id");

-- CreateIndex
CREATE INDEX "uniform_issues_org_id_member_id_idx" ON "uniform_issues"("org_id", "member_id");

-- CreateIndex
CREATE INDEX "asset_loans_org_id_status_expected_return_idx" ON "asset_loans"("org_id", "status", "expected_return");

-- AddForeignKey
ALTER TABLE "asset_custom_fields" ADD CONSTRAINT "asset_custom_fields_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_template_items" ADD CONSTRAINT "kit_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "kit_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

