-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "updatedAt" DATETIME NOT NULL,
    "targetRole" TEXT NOT NULL DEFAULT 'Solutions Engineer',
    "targetCompanies" TEXT NOT NULL DEFAULT '[]',
    "currentRole" TEXT NOT NULL DEFAULT 'Senior Software Engineer',
    "yearsExperience" INTEGER NOT NULL DEFAULT 6,
    "keyBackground" TEXT NOT NULL DEFAULT '',
    "avoidContext" TEXT NOT NULL DEFAULT '',
    "activeCert" TEXT NOT NULL DEFAULT 'AI-102',
    "certPath" TEXT NOT NULL DEFAULT '[]',
    "certNotes" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_UserConfig" ("avoidContext", "currentRole", "id", "keyBackground", "targetCompanies", "targetRole", "updatedAt", "yearsExperience") SELECT "avoidContext", "currentRole", "id", "keyBackground", "targetCompanies", "targetRole", "updatedAt", "yearsExperience" FROM "UserConfig";
DROP TABLE "UserConfig";
ALTER TABLE "new_UserConfig" RENAME TO "UserConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
