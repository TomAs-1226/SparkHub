-- Add join codes + enrollment form metadata to courses
ALTER TABLE "Course" ADD COLUMN "joinCode" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))));
ALTER TABLE "Course" ADD COLUMN "enrollQuestionsJson" TEXT NOT NULL DEFAULT '[]';
CREATE UNIQUE INDEX "Course_joinCode_key" ON "Course"("joinCode");

-- Persist enrollment form answers + flag for join-code enrollment
ALTER TABLE "Enrollment" ADD COLUMN "formAnswersJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Enrollment" ADD COLUMN "joinedViaCode" INTEGER NOT NULL DEFAULT 0;

-- Sessions for courses (live dates + meeting context)
CREATE TABLE "CourseSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "location" TEXT,
    "mode" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Course materials gated to enrolled learners / staff
CREATE TABLE "CourseMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "attachmentUrl" TEXT,
    "contentUrl" TEXT,
    "contentType" TEXT,
    "visibleTo" TEXT NOT NULL DEFAULT 'ENROLLED',
    "uploaderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseMaterial_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseMaterial_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CourseSession_courseId_idx" ON "CourseSession"("courseId");
CREATE INDEX "CourseMaterial_courseId_idx" ON "CourseMaterial"("courseId");
