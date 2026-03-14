-- CreateTable
CREATE TABLE "skill_evidences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "org_member_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "evidence_type" VARCHAR(50) NOT NULL,
    "evidence_url" TEXT,
    "notes" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'submitted',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skill_evidences_org_id_idx" ON "skill_evidences"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_evidences_org_member_id_skill_id_level_key" ON "skill_evidences"("org_member_id", "skill_id", "level");

-- AddForeignKey
ALTER TABLE "skill_evidences" ADD CONSTRAINT "skill_evidences_org_member_id_fkey" FOREIGN KEY ("org_member_id") REFERENCES "org_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_evidences" ADD CONSTRAINT "skill_evidences_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
