-- Add tags storage for courses
ALTER TABLE "Course" ADD COLUMN "tagsJson" TEXT NOT NULL DEFAULT '[]';

-- Extend lessons with attachment metadata
ALTER TABLE "Lesson" ADD COLUMN "attachmentUrl" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "contentUrl" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "contentType" TEXT;

-- Allow inline viewers for materials
ALTER TABLE "CourseMaterial" ADD COLUMN "inlineViewer" BOOLEAN NOT NULL DEFAULT false;

-- Meeting links table
CREATE TABLE "CourseMeetingLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseMeetingLink_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
