import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Set environment variables for tests
process.env.DATABASE_URL = "postgresql://qpset:qpset@localhost:5432/qpset?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret-minimum-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";
process.env.JWT_ACCESS_TTL = "15m";
process.env.JWT_REFRESH_TTL = "7d";
process.env.BCRYPT_ROUNDS = "10";

// Helper to parse cookies from Supertest response headers
function parseCookies(cookieHeaders: string[] | undefined): Record<string, string> {
  if (!cookieHeaders) return {};
  const cookies: Record<string, string> = {};
  cookieHeaders.forEach(header => {
    const parts = header.split(";")[0].split("=");
    if (parts.length === 2) {
      cookies[parts[0]] = parts[1];
    }
  });
  return cookies;
}

// Mock Prisma
vi.mock("../src/db.js", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
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

// Mock rate limiter to be a pass-through in tests
vi.mock("../src/middleware/rateLimit.js", () => {
  const passThrough = (_req: any, _res: any, next: any) => next();
  return {
    authRateLimit: passThrough,
    apiRateLimit: passThrough
  };
});

import { prisma } from "../src/db.js";
import { createApp } from "../src/app.js";

describe("Auth Endpoints & Hardening", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.restoreAllMocks();
  });

  describe("POST /auth/login", () => {
    it("logs in successfully and returns HTTP-only cookies + CSRF token", async () => {
      const mockUser = {
        id: 1,
        username: "hod_user",
        passwordHash: await bcrypt.hash("securePassword123", 10),
        role: "hod",
        name: "HOD Name",
        failedAttempts: 0,
        lockoutUntil: null
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          username: "hod_user",
          password: "securePassword123",
          role: "hod"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = parseCookies(res.headers["set-cookie"]);
      expect(cookies.accessToken).toBeDefined();
      expect(cookies.refreshToken).toBeDefined();
      expect(cookies["csrf-token"]).toBeDefined();
    });

    it("fails login on invalid password and increments failed attempts", async () => {
      const mockUser = {
        id: 1,
        username: "hod_user",
        passwordHash: await bcrypt.hash("securePassword123", 10),
        role: "hod",
        name: "HOD Name",
        failedAttempts: 0,
        lockoutUntil: null
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          username: "hod_user",
          password: "wrongPassword",
          role: "hod"
        });

      expect(res.status).toBe(401);
      expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { failedAttempts: 1 }
        })
      );
    });

    it("locks the account when attempts exceed max limits", async () => {
      let failedAttempts = 4;
      let lockoutUntil: Date | null = null;

      vi.mocked(prisma.user.findUnique).mockImplementation(async () => {
        return {
          id: 1,
          username: "brute_user",
          passwordHash: await bcrypt.hash("correctPassword", 10),
          role: "qpsetter",
          name: "QP Setter",
          failedAttempts,
          lockoutUntil
        } as any;
      });

      vi.mocked(prisma.user.update).mockImplementation(async (args: any) => {
        if (args.data.failedAttempts !== undefined) failedAttempts = args.data.failedAttempts;
        if (args.data.lockoutUntil !== undefined) lockoutUntil = args.data.lockoutUntil;
        return {} as any;
      });

      // Attempt 5 (exceeds limit 5)
      const res1 = await request(app)
        .post("/api/v1/auth/login")
        .send({ username: "brute_user", password: "wrongPassword", role: "qpsetter" });

      expect(res1.status).toBe(401);
      expect(failedAttempts).toBe(5);
      expect(lockoutUntil).not.toBeNull();

      // Attempt 6 should block with 423 Locked
      const res2 = await request(app)
        .post("/api/v1/auth/login")
        .send({ username: "brute_user", password: "correctPassword", role: "qpsetter" });

      expect(res2.status).toBe(423);
      expect(res2.body.error.message).toContain("locked");
    });
  });

  describe("CSRF Validation Guard", () => {
    it("blocks state-changing POST requests without X-CSRF-Token header", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", "accessToken=validtoken; csrf-token=token");

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("CSRF validation failed");
    });

    it("allows state-changing POST requests with matching X-CSRF-Token header", async () => {
      vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue({ id: "uuid", familyId: "family" } as any);
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 } as any);

      const mockPayload = { sub: 1, role: "qpsetter", username: "user" };
      const token = jwt.sign(mockPayload, process.env.JWT_ACCESS_SECRET as string);

      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", `accessToken=${token}; refreshToken=refreshtoken; csrf-token=matchedtoken`)
        .set("X-CSRF-Token", "matchedtoken");

      expect(res.status).toBe(204);
    });
  });

  describe("POST /auth/refresh", () => {
    it("rotates refresh tokens successfully", async () => {
      const mockUser = { id: 1, username: "user", role: "qpsetter" };
      const oldToken = jwt.sign({ sub: 1, role: "qpsetter", username: "user" }, process.env.JWT_REFRESH_SECRET as string);
      const oldHash = crypto.createHash("sha256").update(oldToken).digest("hex");

      const mockTokenRecord = {
        id: "some-uuid",
        familyId: "session-family-123",
        userId: 1,
        tokenHash: oldHash,
        expiresAt: new Date(Date.now() + 100000),
        revoked: false
      };

      vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue(mockTokenRecord as any);
      vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as any);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      // CSRF check on POST /refresh
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", `refreshToken=${oldToken}; csrf-token=token`)
        .set("X-CSRF-Token", "token");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = parseCookies(res.headers["set-cookie"]);
      expect(cookies.accessToken).toBeDefined();
      expect(cookies.refreshToken).toBeDefined();
    });

    it("detects replay attack and revokes entire family on token reuse", async () => {
      const oldToken = jwt.sign({ sub: 1, role: "qpsetter", username: "user" }, process.env.JWT_REFRESH_SECRET as string);
      const oldHash = crypto.createHash("sha256").update(oldToken).digest("hex");

      const mockTokenRecord = {
        id: "some-uuid",
        familyId: "session-family-123",
        userId: 1,
        tokenHash: oldHash,
        expiresAt: new Date(Date.now() + 100000),
        revoked: true // Already revoked! (Reused token)
      };

      vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue(mockTokenRecord as any);
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 } as any);

      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", `refreshToken=${oldToken}; csrf-token=token`)
        .set("X-CSRF-Token", "token");

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("Compromised session");
      expect(vi.mocked(prisma.refreshToken.updateMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { familyId: "session-family-123" },
          data: { revoked: true }
        })
      );
    });
  });
});

