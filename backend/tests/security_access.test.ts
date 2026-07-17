import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

// Set environment variables for tests
process.env.DATABASE_URL = "postgresql://qpset:qpset@localhost:5432/qpset?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret-minimum-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";

// Mock Prisma
vi.mock("../src/db.js", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    assignment: {
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

// Mock rate limiter
vi.mock("../src/middleware/rateLimit.js", () => {
  const passThrough = (_req: any, _res: any, next: any) => next();
  return {
    authRateLimit: passThrough,
    apiRateLimit: passThrough
  };
});

import { prisma } from "../src/db.js";
import { createApp } from "../src/app.js";

function getAuthHeader(userId: number, role: string) {
  const token = jwt.sign({ sub: userId, role, username: "test_user" }, process.env.JWT_ACCESS_SECRET as string);
  return `Bearer ${token}`;
}

describe("Security Scoped Access & IDOR Guards", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.restoreAllMocks();
  });

  describe("IDOR Protection: requireAssignmentOwnership", () => {
    it("blocks Faculty A from accessing Faculty B's assignment", async () => {
      const mockAssignment = {
        id: 101,
        facultyId: 99, // Owned by Faculty B (id 99)
        hodId: 8,
        status: "Pending"
      };

      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);

      // Request from Faculty A (id 2)
      const res = await request(app)
        .put("/api/v1/assignments/101/paper")
        .set("Authorization", getAuthHeader(2, "qpsetter"))
        .set("Cookie", "csrf-token=matchedtoken")
        .set("X-CSRF-Token", "matchedtoken")
        .send({ content: {}, submit: false });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("Access denied");
    });

    it("allows Faculty A to access their own assignment", async () => {
      const mockAssignment = {
        id: 101,
        facultyId: 2, // Owned by Faculty A (id 2)
        hodId: 8,
        status: "Pending",
        course: { courseName: "Data Structures" }
      };

      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);
      vi.mocked(prisma.questionPaper.upsert).mockResolvedValue({} as any);

      const res = await request(app)
        .put("/api/v1/assignments/101/paper")
        .set("Authorization", getAuthHeader(2, "qpsetter"))
        .set("Cookie", "csrf-token=matchedtoken")
        .set("X-CSRF-Token", "matchedtoken")
        .send({ content: {}, submit: false });

      expect(res.status).toBe(200);
    });

    it("blocks HOD A from accessing HOD B's coordinated assignment", async () => {
      const mockAssignment = {
        id: 101,
        facultyId: 2,
        hodId: 88, // Coordinates by HOD B (id 88)
        status: "Pending"
      };

      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);

      // Request from HOD A (id 8)
      const res = await request(app)
        .post("/api/v1/assignments/101/suggestions")
        .set("Authorization", getAuthHeader(8, "hod"))
        .set("Cookie", "csrf-token=matchedtoken")
        .set("X-CSRF-Token", "matchedtoken")
        .send({ fromUserId: 8, message: "Add more questions" });

      expect(res.status).toBe(403);
    });

    it("allows Controller to access any assignment", async () => {
      const mockAssignment = {
        id: 101,
        facultyId: 2,
        hodId: 88,
        status: "Pending",
        course: { courseName: "Data Structures" }
      };

      vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);
      vi.mocked(prisma.assignment.update).mockResolvedValue(mockAssignment as any);

      // Request from Controller (id 1)
      const res = await request(app)
        .patch("/api/v1/assignments/101")
        .set("Authorization", getAuthHeader(1, "controller"))
        .set("Cookie", "csrf-token=matchedtoken")
        .set("X-CSRF-Token", "matchedtoken")
        .send({ status: "Approved" });

      expect(res.status).toBe(200);
    });
  });

  describe("Department Scoping Protection for HOD User Management", () => {
    it("forces newly created faculty dept and coordinator to match HOD properties", async () => {
      const mockHod = {
        id: 8,
        username: "hod_cse",
        role: Role.hod,
        dept: "CSE"
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockHod as any);
      vi.mocked(prisma.user.create).mockResolvedValue({ id: 10, username: "new_fac", role: "qpsetter" } as any);

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", getAuthHeader(8, "hod"))
        .set("Cookie", "csrf-token=matchedtoken")
        .set("X-CSRF-Token", "matchedtoken")
        .send({
          username: "new_fac",
          password: "password123",
          role: "qpsetter",
          name: "New Faculty",
          dept: "ECE" // Try to inject ECE department
        });

      expect(res.status).toBe(201);
      // Verify that HOD's department and ID are forced
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dept: "CSE",
            hodId: 8
          })
        })
      );
    });

    it("blocks HOD A from editing Faculty B in department ECE", async () => {
      const mockHod = { id: 8, username: "hod_cse", role: Role.hod, dept: "CSE" };
      const mockFaculty = { id: 22, username: "fac_ece", role: Role.qpsetter, dept: "ECE" };

      // HOD A is CSE, Faculty B is ECE
      vi.mocked(prisma.user.findUnique).mockImplementation(async (args: any) => {
        if (args.where.id === 8) return mockHod as any;
        if (args.where.id === 22) return mockFaculty as any;
        return null;
      });

      const res = await request(app)
        .patch("/api/v1/users/22")
        .set("Authorization", getAuthHeader(8, "hod"))
        .set("Cookie", "csrf-token=matchedtoken")
        .set("X-CSRF-Token", "matchedtoken")
        .send({ name: "Updated Name" });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("only modify faculty in your department");
    });

    it("blocks HOD A from deleting another HOD", async () => {
      const mockHod = { id: 8, username: "hod_cse", role: Role.hod, dept: "CSE" };
      const otherHod = { id: 9, username: "hod_ece", role: Role.hod, dept: "ECE" };

      vi.mocked(prisma.user.findUnique).mockImplementation(async (args: any) => {
        if (args.where.id === 8) return mockHod as any;
        if (args.where.id === 9) return otherHod as any;
        return null;
      });

      const res = await request(app)
        .delete("/api/v1/users/9")
        .set("Authorization", getAuthHeader(8, "hod"))
        .set("Cookie", "csrf-token=matchedtoken")
        .set("X-CSRF-Token", "matchedtoken");

      expect(res.status).toBe(403);
    });
  });
});
