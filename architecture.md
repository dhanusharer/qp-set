# AMCEC QPSet System Architecture

This document details the architectural layout, components, deployment topology, and communication channels of the **AMCEC QPSet** system.

---

## 1. High-Level Architecture Map

The system follows a standard three-tier architecture:

```
+-------------------------------------------------------------+
|                        Client Tier                          |
|  +--------------------+             +--------------------+  |
|  |   Faculty Browser  |             |    HOD Browser     |  |
|  +---------+----------+             +---------+----------+  |
|            |                                  |             |
|            +-----------------+----------------+             |
|                              |                              |
|                              v                              |
|                      +-------+-------+                      |
|                      |  CoE Browser  |                      |
|                      +-------+-------+                      |
+------------------------------|------------------------------+
                               | HTTPS / REST
                               v
+------------------------------|------------------------------+
|                         App Tier                            |
|             +----------------+----------------+             |
|             |        ALB (Load Balancer)      |             |
|             +----------------+----------------+             |
|                              |                              |
|                              v                              |
|             +----------------+----------------+             |
|             |  Express Backend (ECS Fargate)  |             |
|             +----------------+----------------+             |
+------------------------------|------------------------------+
                               | Prisma / TCP 5432
                               v
+------------------------------|------------------------------+
|                        Database Tier                        |
|             +----------------+----------------+             |
|             |      RDS PostgreSQL Instance    |             |
|             +---------------------------------+             |
+-------------------------------------------------------------+
```

### 1.1 Diagram in Text Form
`Browser (Client) <-> ALB (Load Balancer) <-> Express API Layer (ECS Fargate) <-> Prisma ORM <-> PostgreSQL (RDS)`

---

## 2. Core Tiers & Components

### 2.1 Client Tier (Frontend React Application)
*   **Vite Development Server**: Serves React assets. Resolves module aliases `@/*` to path `./src`.
*   **React Router Engine**: Manages browser history, client-side route matches, and layout injections.
*   **Context States (`AuthContext` and `AppContext`)**: Holds session details and active data structures in memory.
*   **Component Engine**: Leverages tailwind-styled `shadcn/ui` components for styling and interface interactions.
*   **Word Document Exporter (`downloadPaper.ts`)**: Client-side document compiler that converts structured exam data to standard Word (`.doc`) format and triggers native browser downloads.

### 2.2 Application Tier (Express Backend API)
*   **TypeScript Entrypoint (`server.ts`)**: Boots up the HTTP server, handles graceful shutdown hooks on `SIGTERM` / `SIGINT` signals, and disconnects the Prisma client.
*   **Express App Middleware (`app.ts`)**:
    *   **Helmet**: Sets HTTP response headers (HSTS, CSP, X-Frame-Options) for security.
    *   **CORS**: Dynamic origin checking, allowing requests from `FRONTEND_ORIGIN` with credential transmission support.
    *   **JSON Parser**: Limits payload sizes to `1mb` to prevent Denial of Service (DoS) attacks.
    *   **Pino HTTP**: Standardized JSON logs for request profiling.
    *   **Express Rate Limit**: Restricts API calls to prevent brute-force attacks on authentication endpoints.
*   **Authentication Guards (`auth.ts`)**:
    *   `requireAuth`: Inspects the `Authorization` header, extracts the Bearer JWT token, validates it against `JWT_ACCESS_SECRET`, and appends the decoded payload as `req.user`.
    *   `requireRole`: Restricts endpoints to specific enum values of the `Role` model (`controller`, `hod`, `qpsetter`).
*   **Versioned Routers**: All route declarations are contained under `/api/v1` and handle validations via custom Zod rules.

### 2.3 Database Tier (PostgreSQL)
*   **Prisma Client (`db.ts`)**: Exposes typed DB methods.
*   **Schema Config (`schema.prisma`)**: Models relationships and stores credentials as hashed string records. Contains tables for `User`, `Course`, `Scheme`, `SchemeRow`, `Assignment`, `Suggestion`, `QuestionPaper`, `Notification`, and `RefreshToken`.

---

## 3. Infrastructure & Deployment Model (AWS Production Target)

The recommended production architecture for AWS consists of the following elements:

1.  **VPC Infrastructure**:
    *   **Public Subnets**: Houses the Application Load Balancer (ALB) and NAT Gateways.
    *   **Private App Subnets**: Houses the ECS Fargate tasks running the Node/Express backend container.
    *   **Private DB Subnets**: Houses the RDS PostgreSQL Multi-AZ instance.
2.  **Application Load Balancer (ALB)**:
    *   Terminates HTTPS traffic using certificates registered in ACM.
    *   Forwards HTTP traffic to ECS target groups on port 4000.
    *   Exposes liveness health path at `/health/live` and readiness checking at `/health/ready`.
3.  **AWS ECS Fargate Container Execution**:
    *   Runs the production container built using the multi-stage `Dockerfile`.
    *   Automatically runs database migrations on boot: `npx prisma migrate deploy && node dist/src/server.js`.
4.  **AWS Secrets Manager**:
    *   Encrypts and injects critical keys as environment variables during ECS task initialization:
        *   `DATABASE_URL`
        *   `JWT_ACCESS_SECRET`
        *   `JWT_REFRESH_SECRET`
5.  **RDS PostgreSQL 16**:
    *   Provisioned in private subnets with Security Groups allowing access only from the ECS target groups.
    *   Automated daily snapshots and deletion protection enabled.
