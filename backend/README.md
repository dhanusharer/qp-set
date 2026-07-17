# AMCEC QPSet Backend

Production-ready starter backend for the existing QPSet frontend. The current frontend is unchanged and still uses mock React context data; this service exposes the API surface needed for a later adapter layer.

## Stack Choice

- Runtime: Node.js 20, Express, TypeScript.
- Database: PostgreSQL with Prisma migrations.
- API style: versioned REST under `/api/v1`.
- Auth: username/password login, bcrypt password hashes, JWT access tokens, refresh-token records.
- Deployment: Docker container on AWS ECS Fargate with RDS PostgreSQL. This is simpler than Kubernetes for MVP, but can move to EKS later.

Why this stack: the frontend is already TypeScript, the domain is CRUD-heavy, Prisma gives safe migrations, and ECS/RDS is production-grade without the operational weight of a Kubernetes cluster.

## Core Entities

- `User`: controller, HOD, or QP setter/faculty.
- `Course`: department course metadata and supported exam types.
- `Scheme`: question paper scheme with structured rows.
- `Assignment`: assessment paper assignment lifecycle.
- `QuestionPaper`: JSON question paper content tied to an assignment.
- `Suggestion`: revision/review comments.
- `Notification`: user notification feed.
- `RefreshToken`: revocable session persistence.

## API Summary

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET|POST /api/v1/users`
- `GET|POST|PATCH|DELETE /api/v1/courses`
- `GET|POST|PATCH /api/v1/schemes`
- `GET|POST|PATCH /api/v1/assignments`
- `POST /api/v1/assignments/:id/suggestions`
- `PUT /api/v1/assignments/:id/paper`
- `GET|POST /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`
- `GET /health/live`, `/health/ready`, `/health/metrics`
- `GET /docs`

## Local Development

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run db:dev
npm run db:seed
npm run dev
```

With Docker:

```bash
cd backend
cp .env.example .env
docker compose up --build
```

## Deployment Steps: AWS ECS Fargate

1. Create an RDS PostgreSQL 16 instance in private subnets.
2. Store `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `FRONTEND_ORIGIN` in AWS Secrets Manager.
3. Build and push the image to ECR.
4. Create an ECS Fargate service behind an Application Load Balancer.
5. Configure health check path as `/health/ready`.
6. Attach IAM permissions for Secrets Manager read access.
7. Point DNS such as `api.qpset.amcec.edu.in` to the ALB with Route 53.
8. Enable RDS automated backups, deletion protection, and Multi-AZ for production.

## CI/CD

The included GitHub Actions workflow installs backend deps, generates Prisma client, builds, tests, builds Docker image, and includes placeholders for ECR/ECS deployment.

## Security Baseline

- Passwords hashed with bcrypt.
- JWT access token TTL defaults to 15 minutes.
- Refresh tokens are stored as hashes and can be revoked.
- Role-based guards protect controller, HOD, and QP setter workflows.
- Zod validates request bodies and query parameters.
- Helmet sets secure HTTP headers.
- CORS is restricted to `FRONTEND_ORIGIN`.
- Rate limiting applies to `/api`.
- Secrets are environment variables locally and Secrets Manager in AWS.

## Observability

- JSON request logs via Pino.
- Liveness and readiness health endpoints.
- Prometheus metrics at `/health/metrics`.
- Recommended production additions: OpenTelemetry collector, AWS CloudWatch dashboards, error tracking, and alert rules for 5xx rate, latency, DB connections, and failed logins.

## Migration Strategy

1. Keep the frontend unchanged during backend rollout.
2. Deploy backend and seed data matching `src/data/mockData.ts`.
3. Add an API adapter in a future frontend phase behind a feature flag.
4. Run both mock and API-backed modes during acceptance testing.
5. Freeze mock-data changes, migrate final data to PostgreSQL, then switch the adapter flag.

## Test Plan

- Unit tests for validation schemas, status mapping, and auth helpers.
- Integration tests for login and role-protected CRUD routes.
- Contract tests comparing API response shapes to frontend mock-data interfaces.
- Migration tests against temporary PostgreSQL in CI.
- Load smoke test for assignment listing and login.

## Phased Timeline

- Phase 1, MVP, 1-2 weeks: auth, users, courses, schemes, assignments, notifications, Docker, health checks.
- Phase 2, hardening, 1 week: API docs, contract tests, audit logs, file-storage design.
- Phase 3, deployment, 1 week: ECS/RDS, CI/CD, staging environment, backups and monitoring.
- Phase 4, frontend integration, 1-2 weeks: adapter layer, feature flag, UAT, production cutover.

## Risks And Mitigations

- Frontend currently has no API calls: keep backend response shapes close to mock data and integrate later behind a feature flag.
- Question paper content format may evolve: store paper body as JSON now, add stricter versioned schemas after real usage stabilizes.
- Sensitive exam data: enforce private networking, short tokens, audit logs, encrypted backups, and least-privilege IAM.
- Deadline workflow complexity: start with explicit statuses, then add workflow transition tables if approvals become more complex.
