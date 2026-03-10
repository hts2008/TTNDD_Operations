-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "spices_tags" VARCHAR(20)[];

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "spices_tags" VARCHAR(20)[];

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "spices_tags" VARCHAR(20)[];

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "spices_tags" VARCHAR(20)[];

-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "spices_tags" VARCHAR(20)[];

-- CreateTable
CREATE TABLE "file_object_refs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "uploader_user_id" UUID,
    "bucket_name" VARCHAR(200) NOT NULL,
    "object_key" VARCHAR(1000) NOT NULL,
    "original_name" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" UUID,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "file_object_refs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_gate_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "environment" VARCHAR(50) NOT NULL,
    "build_id" VARCHAR(200),
    "commit_sha" VARCHAR(100),
    "profile" VARCHAR(100) NOT NULL DEFAULT 'PROFILE_CORE',
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "report_json" JSONB NOT NULL DEFAULT '{}',
    "links_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "release_gate_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "import_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "success_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "error_details" JSONB NOT NULL DEFAULT '[]',
    "imported_by" UUID,
    "is_dry_run" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_object_refs_org_id_entity_type_entity_id_idx" ON "file_object_refs"("org_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "file_object_refs_org_id_uploaded_at_idx" ON "file_object_refs"("org_id", "uploaded_at");

-- CreateIndex
CREATE INDEX "release_gate_reports_environment_created_at_idx" ON "release_gate_reports"("environment", "created_at");

-- CreateIndex
CREATE INDEX "import_batches_org_id_import_type_idx" ON "import_batches"("org_id", "import_type");
