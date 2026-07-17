-- CreateEnum
CREATE TYPE "Role" AS ENUM ('controller', 'hod', 'qpsetter');

-- CreateEnum
CREATE TYPE "Affiliation" AS ENUM ('internal', 'external');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('Pending', 'Submitted', 'Approved', 'RevisionRequired');

-- CreateEnum
CREATE TYPE "SchemeStatus" AS ENUM ('Draft', 'Finalized');

-- CreateEnum
CREATE TYPE "AssignedByRole" AS ENUM ('controller', 'hod');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "dept" TEXT,
    "subject" TEXT,
    "subjectCode" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "qualification" TEXT,
    "experience" TEXT,
    "joinDate" TIMESTAMP(3),
    "designation" TEXT,
    "affiliation" "Affiliation",
    "college" TEXT,
    "registeredBy" TEXT,
    "registeredOn" TIMESTAMP(3),
    "hodId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "courseName" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "schemeYear" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "examTypes" TEXT[],
    "syllabusFileName" TEXT,
    "bos" TEXT NOT NULL,
    "hodId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "examType" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "schemeYear" TEXT NOT NULL,
    "status" "SchemeStatus" NOT NULL DEFAULT 'Draft',
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hodId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeRow" (
    "id" SERIAL NOT NULL,
    "schemeId" INTEGER NOT NULL,
    "questionNo" TEXT NOT NULL,
    "part" TEXT NOT NULL,
    "maxMarks" INTEGER NOT NULL,
    "expectedPoints" TEXT NOT NULL,
    "co" TEXT NOT NULL,
    "bloomsLevel" TEXT NOT NULL,

    CONSTRAINT "SchemeRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "facultyId" INTEGER NOT NULL,
    "hodId" INTEGER,
    "subject" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "examType" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "scheme" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'Pending',
    "assignedDate" TIMESTAMP(3) NOT NULL,
    "instructions" TEXT,
    "revisionComment" TEXT,
    "syllabusFileName" TEXT,
    "prevPaperFileName" TEXT,
    "timetableFileName" TEXT,
    "assignedBy" TEXT,
    "assignedByRole" "AssignedByRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" SERIAL NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "fromRole" "AssignedByRole" NOT NULL,
    "message" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPaper" (
    "id" SERIAL NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT,
    "assessmentId" TEXT,
    "fromName" TEXT,
    "kind" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Course_courseCode_semester_schemeYear_key" ON "Course"("courseCode", "semester", "schemeYear");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPaper_assignmentId_key" ON "QuestionPaper"("assignmentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeRow" ADD CONSTRAINT "SchemeRow_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPaper" ADD CONSTRAINT "QuestionPaper_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
