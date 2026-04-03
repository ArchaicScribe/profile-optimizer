-- CreateTable
CREATE TABLE "QuestionAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "aiFeedback" TEXT,
    "score" INTEGER,
    "status" TEXT NOT NULL,
    CONSTRAINT "QuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "StudyQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
