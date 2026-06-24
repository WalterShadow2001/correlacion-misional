-- Migration: Add AICorrection, FamilyMember tables + new fields on AIAnalysis

-- Add new columns to AIAnalysis (SQLite no soporte ADD COLUMN con default complejo, lo hacemos simple)
ALTER TABLE "AIAnalysis" ADD COLUMN "userCorrections" TEXT;
ALTER TABLE "AIAnalysis" ADD COLUMN "correctionNotes" TEXT;

-- Create AICorrection table
CREATE TABLE "AICorrection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AICorrection_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "AIAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AICorrection_analysisId_idx" ON "AICorrection"("analysisId");

-- Create FamilyMember table
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "investigatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "isMember" BOOLEAN NOT NULL DEFAULT false,
    "isInvestigator" BOOLEAN NOT NULL DEFAULT false,
    "relationship" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FamilyMember_investigatorId_fkey" FOREIGN KEY ("investigatorId") REFERENCES "Investigator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FamilyMember_investigatorId_idx" ON "FamilyMember"("investigatorId");
