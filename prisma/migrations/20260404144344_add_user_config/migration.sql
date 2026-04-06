-- CreateTable
CREATE TABLE "UserConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "updatedAt" DATETIME NOT NULL,
    "targetRole" TEXT NOT NULL DEFAULT 'Solutions Engineer',
    "targetCompanies" TEXT NOT NULL DEFAULT '[]',
    "currentRole" TEXT NOT NULL DEFAULT 'Senior Software Engineer',
    "yearsExperience" INTEGER NOT NULL DEFAULT 6,
    "keyBackground" TEXT NOT NULL DEFAULT '',
    "avoidContext" TEXT NOT NULL DEFAULT ''
);
