/*
  Warnings:

  - A unique constraint covering the columns `[messageId]` on the table `mail_messages` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,name]` on the table `mail_templates` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "mail_messages" ADD COLUMN     "bcc" TEXT,
ADD COLUMN     "headers" JSONB,
ADD COLUMN     "inReplyTo" TEXT,
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "references" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "mail_messages_messageId_key" ON "mail_messages"("messageId");

-- CreateIndex
CREATE INDEX "mail_messages_folder_idx" ON "mail_messages"("folder");

-- CreateIndex
CREATE UNIQUE INDEX "mail_templates_tenantId_name_key" ON "mail_templates"("tenantId", "name");
