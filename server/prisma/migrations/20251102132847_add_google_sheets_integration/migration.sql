-- CreateTable
CREATE TABLE "google_sheets_connections" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "spreadsheetId" TEXT,
    "sheetName" TEXT,
    "syncDirection" TEXT NOT NULL DEFAULT 'import',
    "fieldMapping" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_sheets_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "google_sheets_connections_tenantId_idx" ON "google_sheets_connections"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "google_sheets_connections_tenantId_spreadsheetId_key" ON "google_sheets_connections"("tenantId", "spreadsheetId");

-- AddForeignKey
ALTER TABLE "google_sheets_connections" ADD CONSTRAINT "google_sheets_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_sheets_connections" ADD CONSTRAINT "google_sheets_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
