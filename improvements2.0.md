# AMCEC QPSet: Technical & Security Architectural Improvement Roadmap (v2.0)
**Author:** Principal Software Architect (15+ Years Experience in Enterprise Systems & Security)  
**Target Project:** AMCEC Question Paper Setting & Management Software  
**Document Status:** Release Draft (Addendum Integrated)  

---

## Executive Summary

This document serves as the **v2.0 Architectural Roadmap & Implementation Plan** for the **AMCEC QPSet** system. It merges the initial analysis with the security, workflow, database, and compliance audit recommendations from the **Addendum**.

It addresses internal conflicts (such as database-level encryption conflicting with pgvector semantic search, and static schema validation conflicting with dynamic college exam structures) and introduces a phase-by-phase implementation plan tailored for academic compliance (including the Indian **DPDP Act, 2023** compliance preparation).

---

## 1. Stack Compatibility & Review of Addendum Proposals

Before laying out the phases, let's review the technical compatibility of the proposed mechanisms against the project's **Node.js / TypeScript / Express / Prisma ORM / PostgreSQL / React** tech stack:

1.  **Prisma AuditLog Schema & BigInt Serialization:** 
    Using a `BigInt` for `AuditLog.id` is correct for high-volume logs. However, **standard JSON does not natively support BigInt serialization** in JavaScript. If audit logs are fetched in Express routes, `JSON.stringify` will throw a TypeError.
    *   *Remedy:* We must configure a custom serializer or serialize the `id` field as a `string` (e.g., in a Prisma middleware or Express response interceptor).
2.  **Audit Middleware Async Execution:** 
    Hooking into the Express `res.on("finish")` event is fully compatible. Express routes run sequentially, and capturing stats/logging asynchronously after response dispatch avoids adding latency to user requests.
3.  **Conflict Resolution: pg_trgm vs. pgvector (A.8):** 
    By default, pgvector requires plain, unencrypted vectors to run similarity checks. Generating these vectors via external LLM/embedding APIs exposes draft exam papers to external servers before they are administered, creating a security leak. 
    *   *Stack Integration:* Implementing PostgreSQL's `pg_trgm` (trigram similarity) runs *entirely* within the local database. Since Prisma does not support trigram operators (`%` or `similarity()`) natively in its query builder, this similarity check must be implemented using Prisma's `$queryRaw` utility:
        ```typescript
        const duplicates = await prisma.$queryRaw`
          SELECT id, text, similarity(text, ${newQuestionText}) AS score 
          FROM "Question" 
          WHERE text % ${newQuestionText} AND similarity(text, ${newQuestionText}) > 0.75
          ORDER BY score DESC;
        `;
        ```
4.  **Dynamic Zod Schemas (A.9):** 
    Using functional TypeScript to build a dynamic Zod validator based on a course's `Scheme` rows is fully compatible. It resolves the conflict between rigid schema structures and flexible exam types (e.g., choice between questions).
5.  **Malware Scanning (A.5):** 
    Running ClamAV requires the target execution environment (e.g., Docker container) to have `clamd` installed and running. Node.js can communicate with `clamd` via TCP sockets using the `clamscan` npm package, which is fast and does not block the thread.

---

## 2. Structured Implementation Phases (Phase 0 to Phase 9)

```mermaid
gridGraph
    Phase0[0. Foundation] --> Phase1[1. Auth & CSRF]
    Phase1 --> Phase2[2. IDOR & Auditing]
    Phase2 --> Phase3[3. Cryptography & DR]
    Phase3 --> Phase4[4. Schemas & Compliance]
    Phase4 --> Phase5[5. Immutability]
    Phase5 --> Phase6[6. Frontend APIs]
    Phase6 --> Phase7[7. DevOps & Metrics]
    Phase7 --> Phase8[8. Regression Tests]
    Phase8 --> Phase9[9. Prod Ready]
```

### Phase 0: Architectural Foundation Setup
*   **Standardize API response formats:** Wrap all responses in a uniform envelope `{ success: boolean, data?: any, error?: { message: string, code: string } }`.
*   **Request Correlation:** Capture or generate `x-request-id` in a global Express middleware and pass it to Pino logger metadata to trace requests across concurrent threads.
*   **Centralized Configuration:** Validate all environment variables on boot using the strict Zod schema inside `env.ts`.

### Phase 1: Authentication, Session Hardening, & CSRF (Immediate Security)
*   **Token Storage Migration:** Move JWT access and refresh tokens from frontend `localStorage` into secure HTTP-Only, Secure, SameSite=Strict cookies.
*   **CSRF Protection:** Add a Synchronizer Token Pattern (or Double-Submit Cookie pattern) to prevent cross-site request forgery on state-changing routes (`POST/PUT/PATCH/DELETE`).
*   **Refresh Token Rotation (RTR) with Reuse Detection:** 
    *   Update the `RefreshToken` model to track `familyId` and `replacedBy`.
    *   If a rotated-out refresh token is presented again (indicating token reuse), immediately revoke all active refresh tokens in that family (`revoked = true`) and force a full re-login.
*   **Distributed Account Lockout:** 
    *   Update the `User` model to track `failedAttempts` and `lockoutUntil`.
    *   Migrate the local map-based lockout logic to check/write to these DB fields (resolving multi-node synchronization issues).
*   **Vulnerability Cleanup:** Delete `GET /api/v1/auth/test-users` to prevent username enumeration.

### Phase 2: Scoped Authorization, IDOR Mitigation, & Audit Logging
*   **IDOR Mitigations:** 
    *   Write the `requireAssignmentOwnership` middleware.
    *   Apply ownership checks on:
        *   `GET /api/v1/assignments/:id`
        *   `PATCH /api/v1/assignments/:id` (HOD/Faculty validation)
        *   `PUT /api/v1/assignments/:id/paper` (faculty must own the assignment)
        *   `POST /api/v1/assignments/:id/suggestions`
*   **Departmental Scoping:** Limit HOD user-management routes (`POST/PATCH/DELETE` in `users.routes.ts`) so HODs can only create or edit users within their department (`user.dept === req.user.dept` and `user.role === Role.qpsetter`).
*   **Audit Logging Infrastructure:** 
    *   Create the `AuditLog` table in PostgreSQL.
    *   Enforce append-only behavior at the PostgreSQL role level (block UPDATE and DELETE actions on the `AuditLog` table).
    *   Register the `auditLog` Express middleware on all assignment, paper, and scheme read/write routes.

### Phase 3: Cryptography, Storage, & Disaster Recovery
*   **Question Paper Encryption:**
    *   Implement field-level encryption for the `content` JSON column in `QuestionPaper`.
    *   Encrypt questions using AES-256-GCM before writing to PostgreSQL, and decrypt upon retrieval. Keep the encryption key strictly in environment variables.
*   **Secure File Uploads & Malware Scanning:**
    *   Scan all uploaded files (syllabuses, previous papers, timetables) using ClamAV (`clamscan`) at the middleware level before storage.
    *   Validate file magic numbers (signatures) for `.docx` and `.pdf` files.
    *   Store files in private S3/MinIO buckets and serve them via pre-signed URLs with a 5-minute expiry.
*   **Backup & Disaster Recovery Strategy:**
    *   Configure automated nightly logical backups (`pg_dump`) with 30-day retention stored in a separate storage account.
    *   Define Recovery Point Objective (RPO: max 24h data loss) and Recovery Time Objective (RTO: max 4h to restore).
    *   Schedule quarterly disaster recovery restore drills into a local staging environment.
    *   Implement automatic database snapshots in CI/CD before running database migrations.
*   **DPDP Compliance Scoping:**
    *   Define data retention policies for user activity logs.
    *   Build standard offboarding deletion paths (anonymization) for faculty records.

### Phase 4: Dynamic Validation, Similarity Checking, & Compliance Engine
*   **Dynamic Zod validation:**
    *   Implement `buildPaperSchema(scheme)` to dynamically build Zod validation rules based on the specific exam blueprint (IAT vs. ESE module configurations).
*   **Server-Side Compliance Engine:**
    *   Write a backend compliance validator that calculates total marks, Bloom's Taxonomy percentages, and CO mappings on the server.
    *   Enforce this validation as a blocker for transitioning status to `Submitted`.
*   **Lexical Duplication Engine:**
    *   Configure PostgreSQL's `pg_trgm` extension.
    *   Implement the duplication check endpoint via `$queryRaw` to compare drafted questions against historical exam papers.

### Phase 5: Locked Paper Immutability & Version Control
*   **Snapshot-on-Approval Schema:**
    *   Add `QuestionPaperSnapshot` model to track approved versions.
    *   Update `QuestionPaper` schema to include `isLocked` (boolean) and `version` (int).
*   **Immutability Guards:**
    *   Write `requireUnlockedPaper` middleware to intercept updates on locked papers.
*   **Locking & Versioning Workflow:**
    *   On transition from HOD review to `Approved`, write a static snapshot to `QuestionPaperSnapshot` and set `isLocked = true`.
    *   If changes are requested, trigger a status transition to `RevisionRequired`, which increments the version counter and sets `isLocked = false`.

### Phase 6: Frontend Integration & UX Resilience
*   **Real API Bindings:** Connect frontend context controllers (`AppContext.tsx` and `AuthContext.tsx`) to run against the live API endpoints, replacing remaining local mock states.
*   **Dynamic Editor Layout:** Build the question paper editor in `CreatePaper.tsx` dynamically by mapping the active course's scheme structures.
*   **Offline UX & Auto-Save:**
    *   Implement auto-saving drafts to `IndexedDB` (using library `localForage` or raw IndexedDB wrapper) every 30 seconds.
    *   Add network check intercepts to sync local offline edits back to `/assignments/:id/paper` once online status is restored.
*   **LaTeX Support:** Integrate math rendering plugins (e.g., `Katex`) into the React question outputs.

### Phase 7: Observability, DevOps, & Scaling
*   **Prometheus Request Metrics:**
    *   Write and register the Express `metricsMiddleware` to observe latency histograms (`http_request_duration_seconds`) on `/api` routes.
    *   Export metrics on `/health/metrics` alongside system memory and PostgreSQL connection metrics.
*   **Performance Tuning:**
    *   Configure database indexes on heavily queried columns (`Course(courseCode)`, `Assignment(assessmentCode)`, `AuditLog(createdAt, resourceId)`).
    *   Configure database connection pooling using Prisma Client.
*   **Containerization & Proxying:**
    *   Configure Docker Compose for Nginx (reverse proxy with TLS offloading, security headers like CSP/HSTS) and Express.

### Phase 8: Comprehensive Testing
*   **Security Regression Tests:**
    *   Write integration tests verifying IDOR controls, locked-paper immutability, and token rotation family invalidation.
*   **Unit & Integration Tests:**
    *   Write unit tests for the compliance engine, dynamic Zod builder, and trigram similarity checker.
*   **CI/CD Guardrails:** Configure the GitHub Action workflow to block builds and PR merges on security regression or unit test failures.

### Phase 9: Production Readiness
*   **Secrets Management:** Move API keys, DB credentials, and encryption secrets to Docker Secrets or environment secret managers.
*   **Documentation:** Complete API OpenAPI/Swagger documents.
*   **DR Restore Mock Run:** Execute a live restore drill of production-simulated database backups.

---

## 3. Security Regression Testing Blueprint

To ensure that the vulnerabilities fixed in Phase 1, Phase 2, and Phase 5 are never reintroduced, the following automated regression suite must be executed in CI:

```typescript
describe("Assignment Ownership & IDOR Guards", () => {
  it("blocks faculty A from reading faculty B's assignment", async () => {
    const res = await request(app)
      .get(`/api/v1/assignments/${facultyBAssignmentId}`)
      .set("Cookie", facultyASessionCookie);
    expect(res.status).toBe(403);
  });

  it("blocks faculty A from writing to faculty B's paper", async () => {
    const res = await request(app)
      .put(`/api/v1/assignments/${facultyBAssignmentId}/paper`)
      .set("Cookie", facultyASessionCookie)
      .send({ content: maliciousPayload });
    expect(res.status).toBe(403);
  });

  it("blocks an HOD from modifying another department's assignment", async () => {
    const res = await request(app)
      .patch(`/api/v1/assignments/${otherDeptAssignmentId}`)
      .set("Cookie", hodSessionCookie);
    expect(res.status).toBe(403);
  });
});

describe("Locked Paper Immutability Guard", () => {
  it("rejects modifications to an Approved paper", async () => {
    const res = await request(app)
      .put(`/api/v1/assignments/${approvedAssignmentId}/paper`)
      .set("Cookie", facultySessionCookie)
      .send({ content: {} });
    expect(res.status).toBe(423);
  });
});

describe("Refresh Token Rotation (RTR) & Reuse Detection", () => {
  it("revokes all tokens in the family when an old refresh token is reused", async () => {
    const { refreshToken: r1 } = await login();
    const { refreshToken: r2 } = await refresh(r1); // rotates r1 -> r2, r1 now invalid
    await refresh(r1); // reuse attempt (should trigger family revocation)
    
    const res = await refresh(r2); // r2 should now ALSO be revoked
    expect(res.status).toBe(401);
  });
});
```

---

## 4. Compliance Footnotes (DPDP Act, 2023)

AMC Engineering College operates in India, where the **Digital Personal Data Protection (DPDP) Act, 2023** is the governing framework for personal data.
*   **Context:** Substantive compliance obligations for data fiduciaries are slated for full enforcement by **13 May 2027**. 
*   **Application Scope:** User data (faculty qualifications, phone numbers, join dates, and activity logs) falls under "personal data."
*   **System Action Items:**
    1.  **Retention Boundaries:** Retain audit logs for exactly 3 years (or legal limitation period) and automatically archive/prune afterwards.
    2.  **Right to Correction/Erasure:** Implement a database cleanup routine to scrub specific personal records (designation, contact details) when a staff member offboards, replacing their name in audit logs with a system placeholder (e.g., `Deleted Faculty - CSE`).
