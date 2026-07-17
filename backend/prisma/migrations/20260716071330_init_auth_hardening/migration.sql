/*
  Warnings:

  - The primary key for the `Assignment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `assignedBy` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `assignedByRole` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `scheme` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `semester` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `subjectCode` on the `Assignment` table. All the data in the column will be lost.
  - The `id` column on the `Assignment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `AuditLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `assessmentId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `fromName` on the `Notification` table. All the data in the column will be lost.
  - The `type` column on the `Notification` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `kind` column on the `Notification` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `RefreshToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `revokedAt` on the `RefreshToken` table. All the data in the column will be lost.
  - You are about to drop the column `createdDate` on the `Scheme` table. All the data in the column will be lost.
  - You are about to drop the column `schemeYear` on the `Scheme` table. All the data in the column will be lost.
  - You are about to drop the column `semester` on the `Scheme` table. All the data in the column will be lost.
  - You are about to drop the column `from` on the `Suggestion` table. All the data in the column will be lost.
  - You are about to drop the column `fromRole` on the `Suggestion` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subjectCode` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[assessmentCode]` on the table `Assignment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[courseId,examType]` on the table `Scheme` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assessmentCode` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseId` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `assignmentId` on the `QuestionPaper` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `familyId` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromUserId` to the `Suggestion` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `assignmentId` on the `Suggestion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning', 'error');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('suggestion', 'assignment', 'approval', 'revision', 'general');

-- DropForeignKey
ALTER TABLE "QuestionPaper" DROP CONSTRAINT "QuestionPaper_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Suggestion" DROP CONSTRAINT "Suggestion_assignmentId_fkey";

-- AlterTable
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_pkey",
DROP COLUMN "assignedBy",
DROP COLUMN "assignedByRole",
DROP COLUMN "scheme",
DROP COLUMN "semester",
DROP COLUMN "subject",
DROP COLUMN "subjectCode",
ADD COLUMN     "assessmentCode" TEXT NOT NULL,
ADD COLUMN     "assignedById" INTEGER,
ADD COLUMN     "courseId" INTEGER NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "facultyId" DROP NOT NULL,
ADD CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "details" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "Role";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "assessmentId",
DROP COLUMN "fromName",
ADD COLUMN     "assignmentId" INTEGER,
ADD COLUMN     "fromUserId" INTEGER,
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'info',
DROP COLUMN "kind",
ADD COLUMN     "kind" "NotificationKind" NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "QuestionPaper" DROP COLUMN "assignmentId",
ADD COLUMN     "assignmentId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_pkey",
DROP COLUMN "revokedAt",
ADD COLUMN     "familyId" TEXT NOT NULL,
ADD COLUMN     "replacedBy" TEXT,
ADD COLUMN     "revoked" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "RefreshToken_id_seq";

-- AlterTable
ALTER TABLE "Scheme" DROP COLUMN "createdDate",
DROP COLUMN "schemeYear",
DROP COLUMN "semester";

-- AlterTable
ALTER TABLE "Suggestion" DROP COLUMN "from",
DROP COLUMN "fromRole",
ADD COLUMN     "fromUserId" INTEGER NOT NULL,
DROP COLUMN "assignmentId",
ADD COLUMN     "assignmentId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "subject",
DROP COLUMN "subjectCode",
ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockoutUntil" TIMESTAMP(3);

-- DropEnum
DROP TYPE "AssignedByRole";

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_assessmentCode_key" ON "Assignment"("assessmentCode");

-- CreateIndex
CREATE INDEX "Assignment_facultyId_idx" ON "Assignment"("facultyId");

-- CreateIndex
CREATE INDEX "Assignment_hodId_idx" ON "Assignment"("hodId");

-- CreateIndex
CREATE INDEX "Assignment_courseId_idx" ON "Assignment"("courseId");

-- CreateIndex
CREATE INDEX "Assignment_status_idx" ON "Assignment"("status");

-- CreateIndex
CREATE INDEX "Assignment_assignedById_idx" ON "Assignment"("assignedById");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "Course_hodId_idx" ON "Course"("hodId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPaper_assignmentId_key" ON "QuestionPaper"("assignmentId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "Scheme_hodId_idx" ON "Scheme"("hodId");

-- CreateIndex
CREATE UNIQUE INDEX "Scheme_courseId_examType_key" ON "Scheme"("courseId", "examType");

-- CreateIndex
CREATE INDEX "Suggestion_assignmentId_idx" ON "Suggestion"("assignmentId");

-- CreateIndex
CREATE INDEX "User_hodId_idx" ON "User"("hodId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
