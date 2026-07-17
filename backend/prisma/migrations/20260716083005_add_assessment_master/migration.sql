-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "assessmentId" INTEGER;

-- CreateTable
CREATE TABLE "Assessment" (
    "id" SERIAL NOT NULL,
    "assessmentCode" TEXT NOT NULL,
    "examType" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "schemeYear" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_assessmentCode_key" ON "Assessment"("assessmentCode");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
