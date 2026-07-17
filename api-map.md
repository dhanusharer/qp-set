# AMCEC QPSet API Inventory

This document maps the entire versioned REST API (`/api/v1`) and health check surface exposed by the backend service.

---

## 1. API Endpoints Catalog

### 1.1 Authentication Endpoints (`/api/v1/auth`)

#### `POST /api/v1/auth/login`
*   **Purpose**: Authenticates credentials and issues tokens.
*   **Authentication Required**: No.
*   **Request Validation (Zod)**:
    ```json
    {
      "username": "string (min 1)",
      "password": "string (min 1)",
      "role": "controller | hod | qpsetter"
    }
    ```
*   **Response Payload (200 OK)**:
    ```json
    {
      "accessToken": "JWT_ACCESS_TOKEN",
      "refreshToken": "JWT_REFRESH_TOKEN",
      "user": {
        "id": 1,
        "username": "swati",
        "role": "qpsetter",
        "name": "Prof. Swati",
        "dept": "CSE",
        "email": "swati@amcec.edu.in"
        // ...safe public fields without passwordHash
      }
    }
    ```
*   **Database Interactions**: Reads `User` table; writes new `RefreshToken` record with hashed token.

#### `GET /api/v1/auth/me`
*   **Purpose**: Retrieves profile of currently authenticated user.
*   **Authentication Required**: Yes (`requireAuth`).
*   **Response Payload (200 OK)**:
    ```json
    {
      "user": {
        "id": 1,
        "username": "swati",
        "role": "qpsetter"
        // ...public user profile fields
      }
    }
    ```
*   **Database Interactions**: Reads `User` table by token `sub` (user id).

#### `POST /api/v1/auth/logout`
*   **Purpose**: Invalidates active session.
*   **Authentication Required**: Yes (`requireAuth`).
*   **Response Payload (204 No Content)**: Empty.
*   **Database Interactions**: Updates `RefreshToken` table setting `revokedAt = now()` for current user.

---

### 1.2 User Registry Endpoints (`/api/v1/users`)

#### `GET /api/v1/users`
*   **Purpose**: Lists academic accounts.
*   **Authentication Required**: Yes (`requireAuth`).
*   **Query Parameters (Zod)**:
    *   `role`: `controller | hod | qpsetter` (optional)
    *   `hodId`: `integer` (optional)
*   **Response Payload (200 OK)**:
    ```json
    {
      "data": [
        {
          "id": 2,
          "username": "swati",
          "role": "qpsetter",
          "name": "Prof. Swati"
          // ...public fields
        }
      ]
    }
    ```
*   **Database Interactions**: Reads `User` table with filters.

#### `POST /api/v1/users`
*   **Purpose**: Registers a new HOD or Faculty account.
*   **Authentication Required**: Yes (`requireRole("controller", "hod")`).
*   **Request Validation (Zod)**:
    ```json
    {
      "username": "string (min 3)",
      "password": "string (min 8)",
      "role": "controller | hod | qpsetter",
      "name": "string",
      "title": "string (optional)",
      "dept": "string (optional)",
      "subject": "string (optional)",
      "subjectCode": "string (optional)",
      "email": "string (email, optional)",
      "phone": "string (optional)",
      "qualification": "string (optional)",
      "experience": "string (optional)",
      "joinDate": "date (optional)",
      "designation": "string (optional)",
      "hodId": "integer (optional)",
      "affiliation": "internal | external (optional)",
      "college": "string (optional)",
      "registeredBy": "string (optional)",
      "registeredOn": "date (optional)"
    }
    ```
*   **Response Payload (201 Created)**:
    ```json
    {
      "data": {
        "id": 10,
        "username": "new_faculty",
        "role": "qpsetter",
        "name": "Prof. New",
        "email": "new@amcec.edu.in",
        "hodId": 8
      }
    }
    ```
*   **Database Interactions**: Hashes password with bcrypt (12 rounds) and inserts new `User` record.

---

### 1.3 Course Registry Endpoints (`/api/v1/courses`)

#### `GET /api/v1/courses`
*   **Purpose**: Retrieves course list.
*   **Authentication Required**: Yes.
*   **Filters**: If the caller is an `hod`, automatically filters to only return courses where `hodId` matches user ID. Otherwise returns all courses.
*   **Response Payload (200 OK)**:
    ```json
    {
      "data": [
        {
          "id": 1,
          "courseName": "Data Structures & Algorithms",
          "courseCode": "21CS32",
          "semester": "3rd Semester",
          "schemeYear": "2021 Scheme",
          "credits": 4,
          "examTypes": ["Internal Assessment (40M)", "End Semester (100M)"],
          "syllabusFileName": "DSA.pdf",
          "bos": "CSE",
          "hodId": 8
        }
      ]
    }
    ```

#### `POST /api/v1/courses`
*   **Purpose**: Creates a course.
*   **Authentication Required**: Yes (`requireRole("controller", "hod")`).
*   **Request Validation (Zod)**: Same schema as course model.
*   **Response Payload (201 Created)**: Returns created course JSON.

#### `PATCH /api/v1/courses/:id`
*   **Purpose**: Updates course details.
*   **Authentication Required**: Yes (`requireRole("controller", "hod")`).
*   **Request Validation**: Partial course schema.

#### `DELETE /api/v1/courses/:id`
*   **Purpose**: Removes a course record.
*   **Authentication Required**: Yes (`requireRole("controller", "hod")`).
*   **Response (204 No Content)**: Empty.

---

### 1.4 Scheme Blueprint Endpoints (`/api/v1/schemes`)

#### `GET /api/v1/schemes`
*   **Purpose**: Lists blueprints with related questions layout.
*   **Authentication Required**: Yes. Filters to matching `hodId` if user is an HOD.
*   **Response Payload (200 OK)**: Includes rows list inside `rows` array.

#### `POST /api/v1/schemes`
*   **Purpose**: Saves a scheme configuration.
*   **Authentication Required**: Yes (`requireRole("hod")`).
*   **Request Validation (Zod)**:
    ```json
    {
      "courseId": 1,
      "examType": "string",
      "semester": "string",
      "schemeYear": "string",
      "hodId": 8,
      "rows": [
        {
          "questionNo": "Q1",
          "part": "a",
          "maxMarks": 4,
          "expectedPoints": "Define ADT",
          "co": "CO1",
          "bloomsLevel": "L1"
        }
      ]
    }
    ```
*   **Response (201 Created)**: Returns created Scheme with rows.

#### `PATCH /api/v1/schemes/:id`
*   **Purpose**: Modifies scheme configuration and nested rows.
*   **Authentication Required**: Yes (`requireRole("hod")`).
*   **Database Interactions**: Updates base scheme, runs transactional cascade deletion of old rows, and writes newly specified rows.

---

### 1.5 Assessment Assignments Endpoints (`/api/v1/assignments`)

#### `GET /api/v1/assignments`
*   **Purpose**: Returns assignment items based on calling user role scope.
*   **Authentication Required**: Yes.
*   **Access Scope Filters**:
    *   `qpsetter`: Retrieves assignments matching `facultyId = userId`.
    *   `hod`: Retrieves assignments matching `hodId = userId`.
    *   `controller`: Retrieves all assignments in database.
*   **Response Payload (200 OK)**: Returns assignments including nested `suggestions` and compiled `paper` details. Applies mapping utility to translate `RevisionRequired` enum status to `"Revision Required"` layout text.

#### `POST /api/v1/assignments`
*   **Purpose**: Dispatches a new paper preparation task.
*   **Authentication Required**: Yes (`requireRole("controller", "hod")`).
*   **Request Validation (Zod)**: Complete Assignment specification.
*   **Response (201 Created)**: Created Assignment JSON.

#### `PATCH /api/v1/assignments/:id`
*   **Purpose**: Update assignment state.
*   **Authentication Required**: Yes.

#### `POST /api/v1/assignments/:id/suggestions`
*   **Purpose**: Adds a revision request message.
*   **Authentication Required**: Yes (`requireRole("controller", "hod")`).
*   **Request Validation (Zod)**:
    ```json
    {
      "from": "Dr. Nandishwar",
      "fromRole": "controller | hod",
      "message": "Update Q2"
    }
    ```

#### `PUT /api/v1/assignments/:id/paper`
*   **Purpose**: Saves draft or submits compiled question paper questions.
*   **Authentication Required**: Yes (`requireRole("qpsetter", "hod")`).
*   **Request Validation (Zod)**:
    ```json
    {
      "content": "any JSON structure representing questions",
      "submit": "boolean (optional)"
    }
    ```
*   **Database Interactions**: Performs transactional `upsert` of `QuestionPaper` record. If `submit` is set to `true`, writes `submittedAt = now()` and sets the parent `Assignment.status = "Submitted"`.

---

### 1.6 Notification Feed Endpoints (`/api/v1/notifications`)

#### `GET /api/v1/notifications`
*   **Purpose**: Retrieves notification logs matching user ID.
*   **Authentication Required**: Yes.

#### `POST /api/v1/notifications`
*   **Purpose**: Pushes alert message log.
*   **Authentication Required**: Yes (`requireRole("controller", "hod")`).

#### `PATCH /api/v1/notifications/:id/read`
*   **Purpose**: Sets read status to `true`.
*   **Authentication Required**: Yes.

---

### 1.7 Health Check Endpoints (`/health`)

#### `GET /health/live`
*   **Purpose**: Container liveness test.
*   **Response**: `200 OK` `{ "status": "ok" }`.

#### `GET /health/ready`
*   **Purpose**: System readiness check (validates active DB connection).
*   **Database Interaction**: Runs raw execution check `SELECT 1`.
*   **Response**: `200 OK` `{ "status": "ready" }` if DB is online; `500 Internal Server Error` if database is down.

#### `GET /health/metrics`
*   **Purpose**: Exposes prometheus collectors (Node.js runtime stats and HTTP histograms).
*   **Response**: `200 OK` (Standard Prometheus metrics text format).
