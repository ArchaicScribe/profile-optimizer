-- CreateTable
CREATE TABLE "StudyGuide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobTitle" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "jdSummary" TEXT,
    "chatHistory" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "StudyQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guideId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "hints" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'unanswered',
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" DATETIME,
    CONSTRAINT "StudyQuestion_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "StudyGuide" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
