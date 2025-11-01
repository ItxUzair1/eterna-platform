-- CreateTable
CREATE TABLE "team_permissions" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "appKey" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_permissions_teamId_idx" ON "team_permissions"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "team_permissions_teamId_appKey_scopeKey_key" ON "team_permissions"("teamId", "appKey", "scopeKey");

-- AddForeignKey
ALTER TABLE "team_permissions" ADD CONSTRAINT "team_permissions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
