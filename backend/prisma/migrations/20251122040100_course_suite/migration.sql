PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "coverUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "joinCode" TEXT NOT NULL,
    "enrollQuestionsJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Course_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Course" (
    "id", "title", "summary", "coverUrl", "isPublished", "creatorId", "createdAt", "updatedAt", "joinCode", "enrollQuestionsJson"
) SELECT
    "id", "title", "summary", "coverUrl", "isPublished", "creatorId", "createdAt", "updatedAt", lower(hex(randomblob(16))), '[]'
FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
CREATE UNIQUE INDEX "Course_joinCode_key" ON "Course"("joinCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
