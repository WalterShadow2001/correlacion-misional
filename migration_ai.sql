-- Incremental migration: only AIAnalysis and AISettings tables

CREATE TABLE "AISettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT NOT NULL DEFAULT 'zai',
    "apiKey" TEXT,
    "customSystemPrompt" TEXT,
    "language" TEXT NOT NULL DEFAULT 'es',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESANDO',
    "summary" TEXT,
    "leadershipTasks" TEXT,
    "generalTasks" TEXT,
    "questions" TEXT,
    "imagePrompt" TEXT,
    "imageDataUrl" TEXT,
    "imageDescription" TEXT,
    "rawResponse" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIAnalysis_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CorrelationMeeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AIAnalysis_meetingId_key" ON "AIAnalysis"("meetingId");
