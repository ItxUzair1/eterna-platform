-- AlterTable
ALTER TABLE "convert_job_items" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "convert_jobs" ALTER COLUMN "status" SET DEFAULT 'PENDING';
