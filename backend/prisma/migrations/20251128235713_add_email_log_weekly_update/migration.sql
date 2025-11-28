/*
  Warnings:

  - You are about to alter the column `isSystem` on the `CourseMessage` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `joinedViaCode` on the `Enrollment` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.

*/
-- DropIndex
DROP INDEX "CourseMaterial_courseId_idx";

-- DropIndex
DROP INDEX "CourseSession_courseId_idx";

-- CreateTable
CREATE TABLE "EmailPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weeklyUpdates" BOOLEAN NOT NULL DEFAULT true,
    "productUpdates" BOOLEAN NOT NULL DEFAULT true,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "errorMessage" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishAt" DATETIME,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "WeeklyUpdate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CourseAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" DATETIME,
    "resourcesJson" TEXT NOT NULL DEFAULT '[]',
    "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
    "creatorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseAssignment_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CourseAssignment" ("attachmentsJson", "courseId", "createdAt", "creatorId", "description", "dueAt", "id", "resourcesJson", "title", "updatedAt") SELECT "attachmentsJson", "courseId", "createdAt", "creatorId", "description", "dueAt", "id", "resourcesJson", "title", "updatedAt" FROM "CourseAssignment";
DROP TABLE "CourseAssignment";
ALTER TABLE "new_CourseAssignment" RENAME TO "CourseAssignment";
CREATE TABLE "new_CourseMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CHANNEL',
    "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
    "visibility" TEXT NOT NULL DEFAULT 'ENROLLED',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseMessage_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CourseMessage_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CourseMessage" ("attachmentsJson", "content", "courseId", "createdAt", "fromUserId", "id", "isSystem", "kind", "visibility") SELECT "attachmentsJson", "content", "courseId", "createdAt", "fromUserId", "id", "isSystem", "kind", "visibility" FROM "CourseMessage";
DROP TABLE "CourseMessage";
ALTER TABLE "new_CourseMessage" RENAME TO "CourseMessage";
CREATE INDEX "CourseMessage_courseId_kind_idx" ON "CourseMessage"("courseId", "kind");
CREATE TABLE "new_CourseSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "content" TEXT,
    "attachmentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "grade" TEXT,
    "feedback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "CourseAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CourseSubmission" ("assignmentId", "attachmentUrl", "content", "createdAt", "feedback", "grade", "id", "status", "studentId", "updatedAt") SELECT "assignmentId", "attachmentUrl", "content", "createdAt", "feedback", "grade", "id", "status", "studentId", "updatedAt" FROM "CourseSubmission";
DROP TABLE "CourseSubmission";
ALTER TABLE "new_CourseSubmission" RENAME TO "CourseSubmission";
CREATE UNIQUE INDEX "CourseSubmission_assignmentId_studentId_key" ON "CourseSubmission"("assignmentId", "studentId");
CREATE TABLE "new_Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formAnswersJson" TEXT NOT NULL DEFAULT '{}',
    "joinedViaCode" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Enrollment" ("adminNote", "courseId", "createdAt", "formAnswersJson", "id", "joinedViaCode", "status", "userId") SELECT "adminNote", "courseId", "createdAt", "formAnswersJson", "id", "joinedViaCode", "status", "userId" FROM "Enrollment";
DROP TABLE "Enrollment";
ALTER TABLE "new_Enrollment" RENAME TO "Enrollment";
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");
CREATE TABLE "new_PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PasswordResetToken" ("createdAt", "expiresAt", "id", "token", "usedAt", "userId") SELECT "createdAt", "expiresAt", "id", "token", "usedAt", "userId" FROM "PasswordResetToken";
DROP TABLE "PasswordResetToken";
ALTER TABLE "new_PasswordResetToken" RENAME TO "PasswordResetToken";
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreference_userId_key" ON "EmailPreference"("userId");
