-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "capacity" INTEGER,
    "description" TEXT,
    "coverUrl" TEXT,
    "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
    "creatorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("capacity", "createdAt", "description", "endsAt", "id", "location", "startsAt", "title") SELECT "capacity", "createdAt", "description", "endsAt", "id", "location", "startsAt", "title" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE TABLE "new_JobPosting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recruiterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skillsCsv" TEXT NOT NULL DEFAULT '',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "duration" TEXT,
    "benefits" TEXT,
    "photosCsv" TEXT NOT NULL DEFAULT '',
    "filesJson" TEXT NOT NULL DEFAULT '[]',
    "contact" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobPosting_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_JobPosting" ("benefits", "contact", "createdAt", "description", "duration", "endTime", "id", "photosCsv", "recruiterId", "skillsCsv", "startTime", "title") SELECT "benefits", "contact", "createdAt", "description", "duration", "endTime", "id", "photosCsv", "recruiterId", "skillsCsv", "startTime", "title" FROM "JobPosting";
DROP TABLE "JobPosting";
ALTER TABLE "new_JobPosting" RENAME TO "JobPosting";
CREATE TABLE "new_Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT,
    "details" TEXT,
    "imageUrl" TEXT,
    "attachmentUrl" TEXT,
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resource_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Resource" ("createdAt", "id", "kind", "summary", "title", "url") SELECT "createdAt", "id", "kind", "summary", "title", "url" FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
