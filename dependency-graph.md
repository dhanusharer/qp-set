# AMCEC QPSet Dependency & Critical Paths

This document maps file import dependencies and highlights critical, high-impact files that must be modified with caution.

---

## 1. Frontend Import Architecture

The React client imports follow a modular hierarchy:

```
           [main.tsx]
               │
               ▼
           [App.tsx]
         /     │     \
        /      │      \
       v       v       v
[Providers] [Layouts] [Pages]
   │           │         │
   │           ▼         ▼
   │     [Components] [Pages/Subdirs]
   \           │         /
    \          ▼        /
  [AuthContext & AppContext] <─────── [mockData.ts]
```

### 1.1 Core Frontend Nodes
*   **[App.tsx](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/amcec-qpset-main/src/App.tsx)**:
    *   Imports routing hooks, context providers, layout templates, and page views.
    *   *Risk*: A failure here breaks the entire routing and mounting of the client.
*   **[AuthContext.tsx](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/amcec-qpset-main/src/contexts/AuthContext.tsx)**:
    *   Imports user lists from `mockData.ts`. Exposes `useAuth` hook.
    *   *Risk*: Changing login signatures affects every guarded component.
*   **[AppContext.tsx](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/amcec-qpset-main/src/contexts/AppContext.tsx)**:
    *   Exposes CRUD functions for courses, schemes, and assignments.
    *   *Risk*: This file acts as the client-side database emulator.
*   **[mockData.ts](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/amcec-qpset-main/src/data/mockData.ts)**:
    *   Stores static data and defines typescript interfaces for the frontend application.
    *   *Risk*: This file is highly coupled; changing any property shape here requires editing pages and layouts.

---

## 2. Backend Import Architecture

The Node backend follows a traditional route-controller-model flow:

```
        [server.ts]
            │
            ▼
         [app.ts]
            │
      +-----+-----+
      │           │
      ▼           ▼
[Middleware]  [Routes]
      │           │
      +-----+-----+
            │
            ▼
         [db.ts] <────── [Prisma Client] <────── [schema.prisma]
```

### 2.1 Core Backend Nodes
*   **[schema.prisma](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/backend/prisma/schema.prisma)**:
    *   Defines tables and relationships. Generates type files for `@prisma/client`.
    *   *Risk*: Database structure changes require running `prisma migrate dev` locally and `prisma migrate deploy` in staging/production.
*   **[app.ts](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/backend/src/app.ts)**:
    *   Initializes Express and mounts middlewares and endpoints.
    *   *Risk*: Modifying security headers or rate limits may cause cross-origin blocks.
*   **[auth.ts](file:///c:/Users/DHANUSH%20A%20G/Downloads/amcec-qpset-main/backend/src/middleware/auth.ts)**:
    *   Handles token decryption and role enforcement.
    *   *Risk*: Mistakes in authorization middleware will open access to protected endpoints.

---

## 3. Coupling & Impact Classification

| File | Classification | Coupling Impact | Modification Risk |
| :--- | :--- | :--- | :--- |
| `schema.prisma` | Core / Database | **High**: Changing tables breaks backend models and SQL query contracts. | **High**: Requires migration scripts. |
| `mockData.ts` | Core / Mock Data | **High**: Exposes mock arrays used in all page views. | **High**: Mismatched property names crash pages. |
| `AppContext.tsx` | State Hub | **High**: Custom context providers handle updates. | **Medium**: Will be completely rewritten to call API. |
| `auth.ts` (middleware) | Security / Gateway | **Medium**: Encapsulates routes authentication. | **High**: Weak security breaks isolation. |
| `App.tsx` | Navigation / Routes | **Medium**: Houses routes and role protection. | **Medium**: Can easily break URL navigations. |
| `env.ts` | Config / Env | **Low**: Reads process.env variables. | **Medium**: Missing variable crashes backend. |
