/*
  Warnings:

  - You are about to drop the column `plan` on the `tenants` table. All the data in the column will be lost.
  - Changed the type of `plan` on the `subscriptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `subscriptions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('individual', 'enterprise_seats', 'enterprise_unlimited');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('active', 'trialing', 'past_due', 'canceled');

-- CreateEnum
CREATE TYPE "LifecycleState" AS ENUM ('active', 'trial_active', 'trial_expired', 'pending_deletion', 'deleted');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "seatsEntitled" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "storageEntitledGB" INTEGER NOT NULL DEFAULT 5,
DROP COLUMN "plan",
ADD COLUMN     "plan" "Plan" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SubStatus" NOT NULL;

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "plan",
ADD COLUMN     "lifecycle_state" "LifecycleState" NOT NULL DEFAULT 'trial_active',
ADD COLUMN     "trial_ends_at" TIMESTAMP(3),
ADD COLUMN     "trial_started_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
