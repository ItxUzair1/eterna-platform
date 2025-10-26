/*
  Warnings:

  - You are about to drop the column `createdBy` on the `todos` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `todos` table. All the data in the column will be lost.
  - Added the required column `userId` to the `todos` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."todos" DROP CONSTRAINT "todos_createdBy_fkey";

-- DropIndex
DROP INDEX "public"."todos_tenantId_createdBy_idx";

-- AlterTable
ALTER TABLE "todos" DROP COLUMN "createdBy",
DROP COLUMN "notes",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "todos_tenantId_userId_idx" ON "todos"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
