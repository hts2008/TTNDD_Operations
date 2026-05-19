ALTER TABLE "skill_evidences"
  ADD COLUMN IF NOT EXISTS "file_ref_id" UUID;

CREATE INDEX IF NOT EXISTS "skill_evidences_org_id_file_ref_id_idx"
  ON "skill_evidences"("org_id", "file_ref_id");

ALTER TABLE "assets"
  ADD COLUMN IF NOT EXISTS "photo_file_ref_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "cover_image_file_ref_id" UUID;

CREATE INDEX IF NOT EXISTS "courses_org_id_cover_image_file_ref_id_idx"
  ON "courses"("org_id", "cover_image_file_ref_id");

ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "media_file_ref_id" UUID;

CREATE INDEX IF NOT EXISTS "lessons_org_id_media_file_ref_id_idx"
  ON "lessons"("org_id", "media_file_ref_id");

ALTER TABLE "quiz_questions"
  ADD COLUMN IF NOT EXISTS "media_file_ref_id" UUID;

CREATE INDEX IF NOT EXISTS "quiz_questions_org_id_media_file_ref_id_idx"
  ON "quiz_questions"("org_id", "media_file_ref_id");

ALTER TABLE "sop_versions"
  ADD COLUMN IF NOT EXISTS "attachment_file_ref_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
