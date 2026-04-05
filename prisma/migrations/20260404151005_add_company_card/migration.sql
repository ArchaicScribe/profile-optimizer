-- CreateTable
CREATE TABLE "CompanyCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "company" TEXT NOT NULL,
    "rawData" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyCard_company_key" ON "CompanyCard"("company");
