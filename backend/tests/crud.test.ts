import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

// Set environment variables for tests
process.env.DATABASE_URL = "postgresql://qpset:qpset@localhost:5432/qpset?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret-minimum-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";

// Mock Prisma
vi.mock("../src/db.js", () => {
  const mockPrisma = {
    user: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    course: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn()
    },
    assignment: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    questionPaper: {
      upsert: vi.fn()
    },
    auditLog: {
      create: vi.fn().mockImplementation(() => Promise.resolve({}))
    },
    $transaction: vi.fn((input) => {
      if (typeof input === "function") return input(mockPrisma);
      return Promise.all(input);
    })
  };
  return { prisma: mockPrisma };
});

import { prisma } from "../src/db.js";
import { createApp } from "../src/app.js";

const app = createApp();

function getAuthHeader(userId: number, role: string) {
  const token = jwt.sign({ sub: userId, role, username: "test_user" }, process.env.JWT_ACCESS_SECRET as string);
  return `Bearer ${token}`;
}

describe("CRUD and Transaction Endpoints", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /users", () => {
    it("allows controllers to create users", async () => {
      const newUser = {
        id: 2,
        username: "new_fac",
        role: "qpsetter",
        name: "New Faculty"
      };

      vi.mocked(prisma.user.create).mockResolvedValue(newUser as any);

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", getAuthHeader(1, "controller"))
        .set("Cookie", "csrf-token=matchedtoken")
        .set("X-CSRF-Token", "matchedtoken")
        .send({
          username: "new_fac",
          password: "newPassword123",
          role: "qpsetter",
          name: "New Faculty"
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe("new_fac");
    });

    it("rejects user creation with invalid role authorizations", async () => {
      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", getAuthHeader(10, "qpsetter"))
        .set("Cookie", "csrf-token=matchedtoken")
        .set("X-CSRF-Token", "matchedtoken")
        .send({
          username: "new_fac",
          password: "newPassword123",
          role: "qpsetter",
          name: "New Faculty"
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("GET /courses", () => {
    it("returns paginated course list", async () => {
      const mockCourses = [
        { id: 1, courseName: "Calculus", courseCode: "MATH101" }
      ];

      vi.mocked(prisma.course.count).mockResolvedValue(1);
      vi.mocked(prisma.course.findMany).mockResolvedValue(mockCourses as any);

      const res = await request(app)
        .get("/api/v1/courses?page=1&limit=5")
        .set("Authorization", getAuthHeader(1, "hod"));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.items[0].courseName).toBe("Calculus");
    });
  });

  describe("PUT /assignments/:id/paper", () => {
    it("performs atomic paper upserts and assignment submission status updates in transaction", async () => {
      const mockPaper = {
        id: 5,
        assignmentId: 123,
        content: { questions: [] }
      };

      const mockAssignment = {
        id: 123,
        facultyId: 1,
        hodId: 4,
        subject: "Physics",
        status: "Submitted",
        course: {
          courseName: "Physics"
        }
      };

      vi.mocked(prisma.questionPaper.upsert).mockResolvedValue(mockPaper as any);
      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);
      vi.mocked(prisma.assignment.update).mockResolvedValue(mockAssignment as any);

      const res = await request(app)
        .put("/api/v1/assignments/123/paper")
        .set("Authorization", getAuthHeader(1, "qpsetter"))
        .set("Cookie", "csrf-token=matchedtoken")
        .set("X-CSRF-Token", "matchedtoken")
        .send({
          content: { questions: [] },
          submit: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(5);
      expect(vi.mocked(prisma.$transaction)).toHaveBeenCalled();
    });
  });
});
