# AMCEC QPSet — Exam Question Paper Setting & Governance Platform

<div align="center">

<!-- Project Logo / Hero Banner -->
<img src="https://raw.githubusercontent.com/dhanusharer/qp-set/main/amcec-qpset-main/public/favicon.ico" alt="AMCEC QPSet Logo" width="110" height="110" onerror="this.style.display='none'"/>

### Secure, Role-Governed Question Paper Authoring, Review, and Workflow Management for Academic Institutions

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

[Quick Start](#-quick-start) · [Architecture Guide](architecture.md) · [API Map](api-map.md) · [Database Schema](database-map.md) · [Route Inventory](routes.md) · [Security Model](#-security)

</div>

---

## 📑 Table of Contents

- [⚡ Quick Start](#-quick-start)
- [🎬 Workflow Demo & Visual Flow](#-workflow-demo--visual-flow)
- [📖 Overview](#-overview)
- [🎯 Why AMCEC QPSet?](#-why-amcec-qpset)
- [✨ Key Features](#-key-features)
- [📦 Installation & Local Setup](#-installation--local-setup)
- [💻 System Requirements & Compatibility](#-system-requirements--compatibility)
- [🚀 Usage & Demo Credentials](#-usage--demo-credentials)
- [⚙️ Configuration & Environment Variables](#️-configuration--environment-variables)
- [🔌 API Overview](#-api-overview)
- [🏗️ Architecture & Tech Stack](#️-architecture--tech-stack)
- [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
- [🔍 Troubleshooting & FAQ](#-troubleshooting--faq)
- [🔒 Security & Authentication](#-security--authentication)
- [🚀 Deployment & Production Operations](#-deployment--production-operations)
- [⚡ Observability & Metrics](#-observability--metrics)
- [🤝 Contributing](#-contributing)
- [🗺️ Roadmap & Changelog](#️-roadmap--changelog)
- [📚 Project Documentation Map](#-project-documentation-map)
- [📄 License & Support](#-license--support)

---

## ⚡ Quick Start

Get the entire full-stack platform (PostgreSQL DB, Express Backend, and React Frontend) running locally in **under 2 minutes**.

### 1. Clone & Set Up Environment Files

```bash
# Clone the repository
git clone https://github.com/dhanusharer/qp-set.git
cd qp-set

# Prepare backend environment
cp backend/.env.example backend/.env
```

### 2. Start PostgreSQL & Run Database Migrations

```bash
# Optional: If you have Docker installed, spin up PostgreSQL instantly:
docker run -d --name qpset-postgres -p 5432:5432 -e POSTGRES_USER=qpset -e POSTGRES_PASSWORD=qpset -e POSTGRES_DB=qpset postgres:16-alpine

# Navigate to backend, install dependencies, migrate and seed sample data
cd backend
npm install
npx prisma migrate deploy
npm run db:seed
```

### 3. Launch Backend & Frontend Servers

```bash
# Terminal 1: Start Backend API (runs on http://localhost:4000)
npm run dev

# Terminal 2: Start Frontend Application (runs on http://localhost:5173)
cd ../amcec-qpset-main
npm install
npm run dev
```

### 4. Verify & Log In

Open **[http://localhost:5173](http://localhost:5173)** in your browser and log in with any seed account:

| Role | Username | Password | Access Level |
|---|---|---|---|
| **Controller of Examinations (CoE)** | `controller` | `password123` | Full administrative, assignment & review authority |
| **Head of Department (HOD)** | `hod_cse` | `password123` | Department course & faculty delegation workbench |
| **Faculty / Question Setter** | `faculty1` | `password123` | Question authoring, rubric scheme builder & export |

---

## 🎬 Workflow Demo & Visual Flow

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                              ACADEMIC EXAM LIFECYCLE                                  │
└───────────────────────────────────────────────────────────────────────────────────────┘
  1. CoE Creates Cycle       2. HOD Assigns Faculty       3. Faculty Drafts Paper       
 ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐       
 │ • Create Exam Term   │───▶│ • Select Course      │───▶│ • Author Questions   │       
 │ • Delegate to HODs   │    │ • Nominate Setters   │    │ • Map Bloom's / COs  │       
 └──────────────────────┘    └──────────────────────┘    └──────────┬───────────┘       
                                                                    │                   
  6. Final Secure Print       5. CoE Final Approval       4. HOD Review & Verification  
 ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────▼───────────┐       
 │ • Encrypted Bundle   │◀───│ • Audit Verification │◀───│ • Review Submissions │       
 │ • Word/PDF Export    │    │ • Approve / Revise   │    │ • Compile Answer Key │       
 └──────────────────────┘    └──────────────────────┘    └──────────────────────┘       
```

---

## 📖 Overview

### The Problem
Traditional exam question paper setting in universities and autonomous colleges is hindered by fragmented and insecure communication:
- Unencrypted emails, USB transfers, and paper drafts create critical **security and leakage vulnerabilities**.
- Manual tracking of course outcomes (COs), Bloom’s taxonomy levels, and marks distribution leads to **syllabus non-compliance**.
- Heads of Department (HODs) and the Controller of Examinations (CoE) lack **real-time visibility** into submission deadlines, approval queues, and revision histories.

### The Solution
**AMCEC QPSet** provides a unified, role-governed digital workbench that streamlines the entire exam setting lifecycle. It enforces academic compliance, automates question scheme calculations, isolates role boundaries with secure JWT authentication, and produces publication-ready Word and PDF exam papers with cryptographic audit logging.

---

## 🎯 Why AMCEC QPSet?

### Differentiators vs. Generic Solutions

| Feature / Capability | AMCEC QPSet | Generic Form Tools | Manual Email / Word Files |
|---|:---:|:---:|:---:|
| **Academic Role Hierarchy (CoE / HOD / Faculty)** | ✅ Native & Enforced | ❌ Generic permissions | ❌ None |
| **Bloom's Taxonomy & Marks Validation** | ✅ Real-Time Auto-Check | ❌ Manual validation | ❌ Error-prone |
| **Integrated Answer Scheme Rubrics** | ✅ Built-in Generator | ❌ External documents | ❌ Disconnected files |
| **Secure Token Auth & Token Revocation** | ✅ Access/Refresh with DB Blacklisting | ⚠️ Basic login | ❌ No access control |
| **Client-Side Word (`.doc`) & Print Compiler** | ✅ 1-Click Native Format | ❌ Plain text/CSV | ⚠️ Manual formatting |
| **Comprehensive Audit Trail & Metrics** | ✅ Prometheus & DB Audit | ❌ Third-party logs | ❌ Untraceable |

### 🚫 Non-Goals (Scope Boundaries)
To maintain security, high performance, and institutional focus, AMCEC QPSet intentionally **does not**:
- **Host Live Student Examination Sessions**: It is strictly an authoring, vetting, and governance platform for academic staff.
- **Act as a Public File Sharing Repository**: Question papers remain strictly encrypted and confidential within role access rules.
- **Lock You to a Specific Cloud**: Runs identically on local Docker, bare-metal servers, or AWS ECS/RDS.

---

## ✨ Key Features

- **🔐 Tri-Tier Role Governance**: Dedicated layouts and permission gates for Controller of Examinations (`controller`), Heads of Department (`hod`), and Question Setters (`qpsetter`).
- **📝 Intelligent Question Authoring**: Real-time validation of marks, section constraints (Part A / Part B), Course Outcomes (COs), and Bloom's Cognitive Levels (L1–L6).
- **📋 Scheme & Solution Builder**: Integrated answer key formulation with step-by-step marking rubrics linked directly to drafted question papers.
- **📄 Client-Side Word (`.doc`) & Print Engine**: Zero-server-overhead document compiler (`downloadPaper.ts`) generating institutional examination formats ready for official printing.
- **🛡️ Enterprise Security**: Dual-token authentication (Access + Refresh JWTs with database revocation), bcrypt password hashing (12 rounds), Helmet security headers, and brute-force rate limiters.
- **📊 Real-time Monitoring & Observability**: Native Prometheus metrics export (`/metrics`), Pino structured JSON logging, and health readiness probes (`/health/live`, `/health/ready`).

---

## 📦 Installation & Local Setup

### System Prerequisites
- **Node.js**: `>= 20.0.0` (LTS recommended)
- **npm**: `>= 10.0.0`
- **PostgreSQL**: `>= 15.0` (or Docker Engine `>= 24.0`)

---

### Step 1: Database Setup

Ensure PostgreSQL is running locally on port `5432`. Create a database named `qpset`:

```bash
# Using PostgreSQL CLI
psql -U postgres -c "CREATE DATABASE qpset;"
psql -U postgres -c "CREATE USER qpset WITH PASSWORD 'qpset';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE qpset TO qpset;"
```

*Or use Docker:*
```bash
docker run -d --name qpset-postgres -p 5432:5432 -e POSTGRES_USER=qpset -e POSTGRES_PASSWORD=qpset -e POSTGRES_DB=qpset postgres:16-alpine
```

---

### Step 2: Backend API Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Generate Prisma client & execute migrations
npx prisma generate
npx prisma migrate deploy

# 4. Seed sample academic data (CoE, HODs, Faculty, Courses)
npm run db:seed

# 5. Start the backend development server
npm run dev
```
*Backend will start on [http://localhost:4000](http://localhost:4000).*

---

### Step 3: Frontend Client Setup

```bash
cd ../amcec-qpset-main

# 1. Install dependencies
npm install

# 2. Start the Vite development server
npm run dev
```
*Frontend will start on [http://localhost:5173](http://localhost:5173).*

---

## 💻 System Requirements & Compatibility

| Component | Minimum Version | Tested & Verified On | Notes |
|---|---|---|---|
| **Node.js** | `>= 20.0.0` | v20.18.0, v22.12.0 | Required for backend ESM & modern crypto APIs |
| **PostgreSQL** | `>= 15.0` | PostgreSQL 15, 16 (RDS / Alpine) | Relational storage & foreign key cascade checks |
| **Operating System** | Any modern OS | Ubuntu 22.04+, macOS Sonoma/Sequoia, Windows 11 / WSL2 | Cross-platform compatibility |
| **Web Browsers** | Evergreen | Chrome 100+, Firefox 100+, Safari 16+, Edge 100+ | Supports CSS Grid, Web Workers & Blob downloads |

---

## 🚀 Usage & Demo Credentials

### Default Seed Users

The database seed script (`backend/prisma/seed.ts`) provisions the following credentials:

```text
┌──────────────┬────────────────────────┬─────────────┬───────────┐
│ Role         │ Username               │ Password    │ Dept      │
├──────────────┼────────────────────────┼─────────────┼───────────┤
│ controller   │ controller             │ password123 │ CoE       │
│ hod          │ hod_cse                │ password123 │ CSE       │
│ hod          │ hod_ise                │ password123 │ ISE       │
│ qpsetter     │ faculty1               │ password123 │ CSE       │
│ qpsetter     │ faculty2               │ password123 │ ISE       │
└──────────────┴────────────────────────┴─────────────┴───────────┘
```

### Core User Journeys

#### 1. Controller of Examinations (`controller`)
1. Log in at `/login` with `controller` / `password123`.
2. Navigate to **Assign to HOD** (`/controller/assign`) to delegate courses for upcoming semester exams.
3. Track overall institutional progress on the **Dashboard** (`/controller/dashboard`).
4. Inspect submitted question papers under **Review & Approve** (`/controller/review`) to give final approval or request revisions.

#### 2. Head of Department (`hod`)
1. Log in with `hod_cse` / `password123`.
2. Register department courses under **Register Courses** (`/hod/register-courses`).
3. Add internal/external question setters in **Register QP Setters** (`/hod/register-qpsetters`).
4. Assign specific course papers and deadlines to faculty in **Assignments** (`/hod/assignments`).
5. Formulate or verify answer rubrics in **Scheme Builder** (`/hod/scheme`).

#### 3. Question Paper Setter (`qpsetter`)
1. Log in with `faculty1` / `password123`.
2. View pending tasks on the **Faculty Dashboard** (`/faculty/dashboard`).
3. Launch the **Question Paper Editor** (`/faculty/create-paper`) to draft questions, assign marks, and specify Bloom's levels.
4. Preview the formatted paper layout in **Preview Paper** (`/faculty/preview-paper`) and export to `.doc` or submit to HOD.

---

## ⚙️ Configuration & Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Type | Default | Required | Description |
|---|:---:|:---:|:---:|---|
| `NODE_ENV` | `string` | `development` | No | Server environment (`development`, `production`, `test`). |
| `PORT` | `number` | `4000` | No | Port on which the Express HTTP server listens. |
| `API_BASE_URL` | `string` | `http://localhost:4000` | No | Publicly accessible base URL of the backend. |
| `FRONTEND_ORIGIN` | `string` | `http://localhost:5173` | **Yes** | Allowed CORS origin for frontend client requests. |
| `DATABASE_URL` | `string` | `postgresql://qpset:qpset@localhost:5432/qpset?schema=public` | **Yes** | PostgreSQL connection string with Prisma schema parameters. |
| `JWT_ACCESS_SECRET` | `string` | — | **Yes** | Cryptographic secret for signing access tokens (min 32 chars). |
| `JWT_REFRESH_SECRET`| `string` | — | **Yes** | Cryptographic secret for signing refresh tokens (min 32 chars). |
| `JWT_ACCESS_TTL` | `string` | `15m` | No | Lifespan of short-lived JWT access tokens. |
| `JWT_REFRESH_TTL` | `string` | `7d` | No | Lifespan of rotating refresh tokens. |
| `BCRYPT_ROUNDS` | `number` | `12` | No | Work factor for password hash computation. |
| `RATE_LIMIT_WINDOW_MS`| `number`| `60000` | No | General API rate limiting window (in ms). |
| `RATE_LIMIT_MAX` | `number` | `120` | No | Maximum requests per IP within the rate limit window. |
| `AUTH_RATE_LIMIT_MAX` | `number`| `5` | No | Maximum failed login attempts before temporary IP block. |

### Frontend Configuration (`amcec-qpset-main/.env`)

| Variable | Type | Default | Description |
|---|:---:|:---:|---|
| `VITE_API_BASE_URL` | `string` | `http://localhost:4000/api/v1` | Base URL of the backend REST API endpoints. |

---

## 🔌 API Overview

> **3-Sentence Summary**: The backend exposes a versioned REST API (`/api/v1`) with Zod-validated payloads, JWT bearer authentication, and role authorization guards. It manages users, courses, assignments, question papers, marking schemes, and real-time notifications. For the complete endpoint catalog, request/response schemas, and error codes, refer to [api-map.md](api-map.md).

### Core REST Endpoints Summary

| Module | Method | Endpoint | Access Level | Description |
|---|:---:|---|:---:|---|
| **Auth** | `POST` | `/api/v1/auth/login` | Public | Authenticate user & issue Access/Refresh token pair |
| **Auth** | `POST` | `/api/v1/auth/refresh`| Public | Rotate tokens using a valid refresh token |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated | Retrieve current user profile and role |
| **Auth** | `POST` | `/api/v1/auth/logout` | Authenticated | Invalidate refresh token and clear active session |
| **Users** | `GET` | `/api/v1/users` | CoE / HOD | List academic faculty and coordinators |
| **Courses** | `GET/POST` | `/api/v1/courses` | CoE / HOD | Manage curriculum courses and branch mappings |
| **Assignments**| `GET/POST` | `/api/v1/assignments` | Authenticated | Create, delegate, and update exam paper tasks |
| **Papers** | `GET/POST` | `/api/v1/question-papers` | Authenticated | Author, save drafts, and submit question papers |
| **Schemes** | `GET/POST` | `/api/v1/schemes` | HOD / Faculty | Create and manage answer keys and marking rubrics |
| **Metrics** | `GET` | `/metrics` | Public / Monitor | Export Prometheus scrape metrics |
| **Health** | `GET` | `/health/live`, `/health/ready` | Public / ALB | Kubernetes and AWS ALB health check probes |

📖 *Swagger UI documentation is available locally at [http://localhost:4000/swagger](http://localhost:4000/swagger).*

---

## 🏗️ Architecture & Tech Stack

> **3-Sentence Summary**: AMCEC QPSet employs a decoupled 3-tier architecture with a React client, Express/TypeScript API layer, and PostgreSQL relational database managed by Prisma ORM. The system isolates business logic from transport protocols, using role middleware and Zod schemas to ensure strict academic governance. Read the full system design and cloud deployment topology in [architecture.md](architecture.md).

### System Component Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│        React 18  •  Vite 5  •  TypeScript  •  Tailwind / shadcn        │
│    [CoE Workbench]      [HOD Coordinator]      [Faculty Authoring]     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST (JWT Bearer)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION TIER                             │
│       Express 4  •  TypeScript  •  Helmet  •  Zod  •  Pino Logger      │
│    [Auth & Guards] ──▶ [Role Controllers] ──▶ [Prisma ORM Engine]      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ TCP 5432 (Prisma Client)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                            DATABASE TIER                               │
│                       PostgreSQL 16 (Multi-AZ)                         │
│   (Users, Courses, Schemes, Assignments, Question Papers, Tokens)      │
└────────────────────────────────────────────────────────────────────────┘
```

### Technology Matrix

| Layer | Technology | Primary Purpose |
|---|---|---|
| **Frontend Framework** | React 18 + Vite 5 | Reactive UI engine with sub-second HMR |
| **UI Components & Styling** | Tailwind CSS + Radix UI (shadcn) | Accessible, responsive, dark-mode-ready design system |
| **State Management** | React Context + TanStack Query | Client session state & asynchronous cache synchronization |
| **Backend Runtime** | Node.js 20+ / Express 4 / TypeScript | High-performance, type-safe REST API server |
| **Database & ORM** | PostgreSQL 16 + Prisma ORM 5 | ACID-compliant relational storage & typed query generation |
| **Security & Auth** | JWT (`jsonwebtoken`) + `bcryptjs` | Access token issuance, rotation, and password hashing |
| **Observability** | Pino HTTP + `prom-client` | Structured JSON log streaming and Prometheus metrics |

### Repository Directory Structure

```text
amcec-qpset-main/
├── backend/                      # Backend API (Node.js, Express, TypeScript, Prisma)
│   ├── prisma/                   # Database schema, migrations & seed scripts
│   │   ├── schema.prisma         # Prisma data models & relation definitions
│   │   └── seed.ts               # Sample user & academic data seeder
│   ├── src/                      # Source code
│   │   ├── middleware/           # Auth guards (`requireAuth`, `requireRole`), rate limiters
│   │   ├── routes/               # Versioned API routes (`/api/v1/*`)
│   │   ├── services/             # Business logic & database operations
│   │   ├── utils/                # Token helpers, Pino logger, validation utils
│   │   ├── app.ts                # Express app initialization & middleware stack
│   │   └── server.ts             # HTTP server entry point & graceful shutdown hooks
│   └── tests/                    # Vitest unit & integration test suites
│
├── amcec-qpset-main/             # Frontend Client (React, Vite, TypeScript, Tailwind)
│   ├── src/
│   │   ├── components/           # Reusable UI components (shadcn/ui, status badges)
│   │   ├── contexts/             # AuthContext, AppContext for global session state
│   │   ├── layouts/              # Role-specific layouts (`ControllerLayout`, `HodLayout`, etc.)
│   │   ├── pages/                # Page views for CoE, HOD, Faculty, and Auth
│   │   ├── utils/                # Document exporters (`downloadPaper.ts`), helpers
│   │   └── App.tsx               # Route configurations and provider bindings
│   └── vite.config.ts            # Vite bundler & path alias configuration
│
├── architecture.md               # In-depth architectural layout & AWS topology
├── api-map.md                    # Complete REST API endpoint inventory & schemas
├── database-map.md               # Prisma relational schema map & data dictionary
├── routes.md                     # Frontend routing map & page-role permissions
└── README.md                     # Project Front Door (this document)
```

---

## 🧪 Testing & Quality Assurance

We enforce automated test coverage across both the backend API and frontend client applications.

```bash
# -------------------------------------------------------------
# 1. Backend Testing (Vitest + Supertest)
# -------------------------------------------------------------
cd backend

# Run all backend unit & integration tests
npm run test

# Run tests in watch mode
npx vitest

# Run linter
npm run lint

# -------------------------------------------------------------
# 2. Frontend Testing (Vitest + Playwright)
# -------------------------------------------------------------
cd ../amcec-qpset-main

# Run frontend unit tests
npm run test

# Run Playwright end-to-end (E2E) tests
npx playwright test
```

---

## 🔍 Troubleshooting & FAQ

### Common Issues

#### 1. Backend Error: `Can't reach database server at localhost:5432`
- **Cause**: PostgreSQL service is not active, or `.env` credentials do not match your database instance.
- **Fix**: Verify your PostgreSQL service is running (`pg_isready` or `docker ps`). Check that `DATABASE_URL` in `backend/.env` is formatted correctly:
  ```env
  DATABASE_URL=postgresql://qpset:qpset@localhost:5432/qpset?schema=public
  ```

#### 2. CORS Error in Browser Console (`Access-Control-Allow-Origin`)
- **Cause**: Frontend origin mismatch with backend CORS policy.
- **Fix**: Ensure `FRONTEND_ORIGIN` in `backend/.env` matches your Vite dev server port (default: `http://localhost:5173`).

#### 3. Error: `PrismaClientInitializationError` / Table does not exist
- **Cause**: Migrations were not applied after setting up the database.
- **Fix**: Run `npx prisma migrate deploy` and `npm run db:seed` in the `backend/` directory.

---

### Frequently Asked Questions

<details>
<summary><b>Can faculty export question papers without an active internet connection?</b></summary>

Yes. The Word document exporter (`downloadPaper.ts`) runs entirely in the browser using client-side JavaScript DOM construction and triggers an immediate native `.doc` download.
</details>

<details>
<summary><b>How are revoked JWT refresh tokens handled?</b></summary>

When a user logs out or rotates tokens, the refresh token record in the `RefreshToken` database table is marked with `revokedAt = now()`. Any subsequent attempt to present a revoked token will fail validation and clear client credentials.
</details>

---

## 🔒 Security & Authentication

- **Authentication Architecture**: Dual-token flow. Short-lived Access Tokens (`15m`) authenticate stateless API requests. Long-lived Refresh Tokens (`7d`) are securely stored as hashed records in PostgreSQL and rotated upon each refresh.
- **Password Security**: Passwords are never stored in plaintext and are salted and hashed using `bcryptjs` with 12 computation rounds.
- **Header Protection**: Express middleware utilizes `helmet` to set Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), X-Content-Type-Options, and clickjacking protection (`X-Frame-Options: DENY`).
- **Brute Force Protection**: Stricter rate limiting (`5 attempts / 15 minutes`) is enforced on authentication routes (`/api/v1/auth/login`) with automatic temporary account lockout.
- **Vulnerability Disclosure**: To report security concerns, please open a private report via [GitHub Security Advisories](https://github.com/dhanusharer/qp-set/security/advisories) or contact the lead maintainer directly.

---

## 🚀 Deployment & Production Operations

> **3-Sentence Summary**: AMCEC QPSet is production-ready for containerized deployment on AWS ECS Fargate or Docker Swarm with PostgreSQL RDS. The backend includes automated database migration triggers on startup, structured Pino JSON logging, and dedicated ALB health check endpoints (`/health/live`, `/health/ready`). See [architecture.md#3-infrastructure--deployment-model](architecture.md) for full AWS CloudFormation/Terraform topology.

### Production Container Build

```bash
# Build production backend image
cd backend
docker build -t amcec-qpset-backend:latest .

# Run production container
docker run -d \
  --name qpset-backend \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:password@rds-endpoint:5432/qpset?schema=public" \
  -e JWT_ACCESS_SECRET="your-production-32-char-secret" \
  -e JWT_REFRESH_SECRET="your-production-32-char-refresh-secret" \
  -e FRONTEND_ORIGIN="https://qpset.amcec.edu.in" \
  amcec-qpset-backend:latest
```

---

## ⚡ Observability & Metrics

AMCEC QPSet is instrumented for production site reliability engineering:

- **Prometheus Metrics (`/metrics`)**: Exposes default Node.js runtime metrics (event loop lag, memory RSS/heap, GC cycles) and custom HTTP request duration histograms.
- **Liveness & Readiness Probes**:
  - `/health/live`: Lightweight probe for load balancer health checks.
  - `/health/ready`: Validates active database connectivity through Prisma before accepting traffic.
- **Structured JSON Logging**: Every HTTP request is serialized as structured JSON with request IDs, response durations, and status codes for ingestion by Datadog, AWS CloudWatch, or Grafana Loki.

---

## 🤝 Contributing

We welcome contributions from faculty, developers, and students!

1. **Fork the Repository**: Click "Fork" on GitHub and clone your fork locally.
2. **Create a Feature Branch**: `git checkout -b feat/add-latex-equation-support`
3. **Commit Changes**: Follow conventional commits (`git commit -m "feat(editor): add LaTeX math formula support"`).
4. **Run Verification**: Ensure all tests pass (`npm run test` in backend & frontend).
5. **Open a Pull Request**: Submit your PR with a concise description of changes and test steps.

---

## 🗺️ Roadmap & Changelog

### Version Roadmap
- [x] **v1.0**: Core tri-tier governance (CoE, HOD, Faculty), Question authoring & Word export.
- [x] **v1.5**: Secure JWT refresh token rotation, rate limiting, and Prometheus metrics.
- [ ] **v2.0**: LaTeX math formula editor & embedded equation renderer for engineering papers.
- [ ] **v2.1**: Automated Bloom's Taxonomy AI analysis & syllabus coverage heatmap.
- [ ] **v2.2**: Integrated multi-institution external examiner peer-review portal.

---

## 📚 Project Documentation Map

Deep technical documentation is organized in the root directory:

| Document | Description |
|---|---|
| 🏛️ **[architecture.md](architecture.md)** | Full architectural design, 3-tier layout & AWS ECS/RDS topology |
| 🔌 **[api-map.md](api-map.md)** | Exhaustive REST API endpoint catalog, Zod schemas & payloads |
| 🗄️ **[database-map.md](database-map.md)** | Prisma data models, relational mappings & database dictionary |
| 🗺️ **[routes.md](routes.md)** | Frontend React router tree, page components & role permissions |
| 📈 **[dependency-graph.md](dependency-graph.md)** | Inter-component dependencies and import hierarchies |
| 🚀 **[improvements2.0.md](improvements2.0.md)** | Security hardening, scalability upgrades & feature backlog |

---

## 📄 License & Support

### License
This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for complete details.

### Support & Contact
- **Institution**: AMC Engineering College (AMCEC)
- **Repository**: [https://github.com/dhanusharer/qp-set](https://github.com/dhanusharer/qp-set)
- **Issue Tracker**: [GitHub Issues](https://github.com/dhanusharer/qp-set/issues)

---

<div align="center">

Developed with pride for **AMC Engineering College (AMCEC)**.

⭐ **Star this repository** if you find it helpful!

</div>
