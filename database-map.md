# AMCEC QPSet Database Map

This document maps out the database architecture, schema properties, and relational constraints defined via Prisma ORM for PostgreSQL.

---

## 1. Schema Specifications

All definitions are parsed from [schema.prisma](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/backend/prisma/schema.prisma).

### 1.1 Enums

#### `Role`
Stores credentials authorization levels:
*   `controller`: Exam Controller.
*   `hod`: Head of Department and Coordinator.
*   `qpsetter`: Teaching faculty and external question paper setters.

#### `Affiliation`
Used to classify faculty type:
*   `internal`: Active AMC Engineering College faculty.
*   `external`: Outside experts invited to write papers.

#### `AssignmentStatus`
State machine tracker for paper preparation lifecycle:
*   `Pending`: Assignment dispatched, paper not yet created.
*   `Submitted`: Draft complete and sent to HOD.
*   `Approved`: Passed quality review and signed off.
*   `RevisionRequired`: Flagged by coordinator/CoE for updates.

#### `SchemeStatus`
*   `Draft`: Work in progress.
*   `Finalized`: Approved blueprints.

#### `AssignedByRole`
Indicates who created an assignment/suggestion:
*   `controller`
*   `hod`

---

## 2. Table Schemas

### 2.1 `User`
*   **Purpose**: Stores logins, credentials and profile variables.
*   **Fields**:
    *   `id` (`Int`, PK, Autoincrement)
    *   `username` (`String`, Unique)
    *   `passwordHash` (`String`)
    *   `role` (`Role` enum)
    *   `name` (`String`)
    *   `title` (`String`, Nullable)
    *   `dept` (`String`, Nullable)
    *   `subject` (`String`, Nullable)
    *   `subjectCode` (`String`, Nullable)
    *   `email` (`String`, Unique, Nullable)
    *   `phone` (`String`, Nullable)
    *   `qualification` (`String`, Nullable)
    *   `experience` (`String`, Nullable)
    *   `joinDate` (`DateTime`, Nullable)
    *   `designation` (`String`, Nullable)
    *   `affiliation` (`Affiliation` enum, Nullable)
    *   `college` (`String`, Nullable)
    *   `registeredBy` (`String`, Nullable)
    *   `registeredOn` (`DateTime`, Nullable)
    *   `hodId` (`Int`, Nullable, FK references `User.id`)
    *   `createdAt` (`DateTime`, Default now)
    *   `updatedAt` (`DateTime`, Updated automatically)

### 2.2 `Course`
*   **Purpose**: Registry of courses.
*   **Fields**:
    *   `id` (`Int`, PK, Autoincrement)
    *   `courseName` (`String`)
    *   `courseCode` (`String`)
    *   `semester` (`String`)
    *   `schemeYear` (`String`)
    *   `credits` (`Int`)
    *   `examTypes` (`String[]` array)
    *   `syllabusFileName` (`String`, Nullable)
    *   `bos` (`String` Board of Studies)
    *   `hodId` (`Int`, FK references `User.id`)
    *   `createdAt` (`DateTime`, Default now)
    *   `updatedAt` (`DateTime`)
*   **Unique Index**: `@@unique([courseCode, semester, schemeYear])`

### 2.3 `Scheme`
*   **Purpose**: Question Paper Scheme templates.
*   **Fields**:
    *   `id` (`Int`, PK, Autoincrement)
    *   `courseId` (`Int`, FK references `Course.id`)
    *   `examType` (`String`)
    *   `semester` (`String`)
    *   `schemeYear` (`String`)
    *   `status` (`SchemeStatus` enum, Default `Draft`)
    *   `createdDate` (`DateTime`, Default now)
    *   `hodId` (`Int`, FK references `User.id`)
    *   `createdAt` (`DateTime`, Default now)
    *   `updatedAt` (`DateTime`)

### 2.4 `SchemeRow`
*   **Purpose**: Blueprint row mapping standard expected points, COs, and Bloom's levels per question number.
*   **Fields**:
    *   `id` (`Int`, PK, Autoincrement)
    *   `schemeId` (`Int`, FK references `Scheme.id`, OnDelete `Cascade`)
    *   `questionNo` (`String`)
    *   `part` (`String`)
    *   `maxMarks` (`Int`)
    *   `expectedPoints` (`String`)
    *   `co` (`String`)
    *   `bloomsLevel` (`String`)

### 2.5 `Assignment`
*   **Purpose**: Paper task deadlines and configuration settings.
*   **Fields**:
    *   `id` (`String`, PK)
    *   `description` (`String`, Nullable)
    *   `facultyId` (`Int`, FK references `User.id`)
    *   `hodId` (`Int`, Nullable, FK references `User.id`)
    *   `subject` (`String`)
    *   `subjectCode` (`String`)
    *   `examType` (`String`)
    *   `semester` (`String`)
    *   `scheme` (`String`)
    *   `startDate` (`DateTime`, Nullable)
    *   `dueDate` (`DateTime`)
    *   `status` (`AssignmentStatus` enum, Default `Pending`)
    *   `assignedDate` (`DateTime`)
    *   `instructions` (`String`, Nullable)
    *   `revisionComment` (`String`, Nullable)
    *   `syllabusFileName` (`String`, Nullable)
    *   `prevPaperFileName` (`String`, Nullable)
    *   `timetableFileName` (`String`, Nullable)
    *   `assignedBy` (`String`, Nullable)
    *   `assignedByRole` (`AssignedByRole` enum, Nullable)
    *   `createdAt` (`DateTime`, Default now)
    *   `updatedAt` (`DateTime`)

### 2.6 `Suggestion`
*   **Purpose**: Log revision feed comments attached to assignments.
*   **Fields**:
    *   `id` (`Int`, PK, Autoincrement)
    *   `assignmentId` (`String`, FK references `Assignment.id`, OnDelete `Cascade`)
    *   `from` (`String`)
    *   `fromRole` (`AssignedByRole` enum)
    *   `message` (`String`)
    *   `date` (`DateTime`, Default now)

### 2.7 `QuestionPaper`
*   **Purpose**: Stores structured questions as a JSON document.
*   **Fields**:
    *   `id` (`Int`, PK, Autoincrement)
    *   `assignmentId` (`String`, Unique, FK references `Assignment.id`, OnDelete `Cascade`)
    *   `content` (`Json` schema)
    *   `submittedAt` (`DateTime`, Nullable)
    *   `createdAt` (`DateTime`, Default now)
    *   `updatedAt` (`DateTime`)

### 2.8 `Notification`
*   **Purpose**: User alerting history logs.
*   **Fields**:
    *   `id` (`Int`, PK, Autoincrement)
    *   `userId` (`Int`, FK references `User.id`, OnDelete `Cascade`)
    *   `message` (`String`)
    *   `date` (`DateTime`, Default now)
    *   `read` (`Boolean`, Default `false`)
    *   `type` (`String`, Nullable)
    *   `assessmentId` (`String`, Nullable)
    *   `fromName` (`String`, Nullable)
    *   `kind` (`String`, Nullable)

### 2.9 `RefreshToken`
*   **Purpose**: Tracking user sessions.
*   **Fields**:
    *   `id` (`Int`, PK, Autoincrement)
    *   `userId` (`Int`, FK references `User.id`, OnDelete `Cascade`)
    *   `tokenHash` (`String`)
    *   `expiresAt` (`DateTime`)
    *   `revokedAt` (`DateTime`, Nullable)
    *   `createdAt` (`DateTime`, Default now)

---

## 3. Entity Relationships Diagram

```
User (HOD) 1 ──────* User (Faculty)
User 1 ────────────* Course (via hodId)
User 1 ────────────* Scheme (via hodId)
User (Faculty) 1 ──* Assignment (via facultyId)
User (HOD) 1 ──────* Assignment (via hodId)
User 1 ────────────* Notification (via userId)
User 1 ────────────* RefreshToken (via userId)

Course 1 ──────────* Scheme (via courseId)
Scheme 1 ──────────* SchemeRow (via schemeId)

Assignment 1 ──────1 QuestionPaper (via assignmentId)
Assignment 1 ──────* Suggestion (via assignmentId)
```
