ALTER TABLE "CourseMessage" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'CHANNEL';
ALTER TABLE "CourseMessage" ADD COLUMN "attachmentsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "CourseMessage" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'ENROLLED';
ALTER TABLE "CourseMessage" ADD COLUMN "isSystem" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "CourseMessage_courseId_kind_idx" ON "CourseMessage"("courseId", "kind");
