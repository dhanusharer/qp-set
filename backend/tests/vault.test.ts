import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { splitSecret } from "../src/utils/shamirSecretSharing.js";

process.env.DATABASE_URL = "postgresql://qpset:qpset@localhost:5432/qpset?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret-minimum-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";
process.env.STRONG_ROOM_TERMINAL_TOKEN = "AMCEC-STRONGROOM-SECURE-TERMINAL-2026";

const CSRF_COOKIE = "csrf-token=matchedtoken";
const CSRF_HEADER = "matchedtoken";

vi.mock("../src/db.js", () => {
  const mockPrisma = {
    paperForm: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({})
    }
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

describe("Cryptographic Vault Sealing & Strong Room Unsealing API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/v1/vault/papers/:formId/seal", () => {
    it("seals paper into vault, generates canonical hash and 5 trustee SSS shares", async () => {
      (prisma.paperForm.findUnique as any).mockResolvedValue({
        id: 1,
        setName: "Set A",
        blueprint: {
          totalMarks: 100,
          courseOffering: { course: { courseCode: "22CS61" } }
        },
        snapshots: [
          {
            questionNumber: "Q1",
            frozenMarks: 20,
            frozenBlooms: "L2",
            frozenCoCode: "CO1",
            frozenStemJson: { text: "Explain MapReduce" },
            frozenRubric: []
          }
        ]
      });

      (prisma.paperForm.update as any).mockResolvedValue({ id: 1, status: "SEALED" });

      const res = await request(app)
        .post("/api/v1/vault/papers/1/seal")
        .set("Authorization", getAuthHeader(1, "controller"))
        .set("Cookie", CSRF_COOKIE)
        .set("X-CSRF-Token", CSRF_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sealedDigest).toHaveLength(64); // SHA-256 hex string
      expect(res.body.trusteePackages).toHaveLength(5); // 5 designated trustees
      expect(res.body.trusteePackages[0].trusteeRole).toBe("Chief Controller of Examinations");
      expect(prisma.paperForm.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: { status: "SEALED" } })
      );
    });
  });

  describe("POST /api/v1/vault/papers/:formId/unseal", () => {
    it("unseals paper in Strong Room when 3 valid SSS shares are provided", async () => {
      (prisma.paperForm.findUnique as any).mockResolvedValue({
        id: 1,
        setName: "Set A",
        status: "SEALED",
        blueprint: {
          totalMarks: 100,
          durationMinutes: 180,
          instructions: "Answer all modules",
          courseOffering: { course: { courseCode: "22CS61", courseName: "Cloud Computing" } }
        },
        snapshots: []
      });

      // Generate 5 SSS shares for a dummy test key
      const testKey = "test-vault-unsealing-key-256bit!";
      const allShares = splitSecret(testKey, 5, 3);
      const threeShares = [allShares[0], allShares[2], allShares[4]];

      const res = await request(app)
        .post("/api/v1/vault/papers/1/unseal")
        .set("Authorization", getAuthHeader(1, "controller"))
        .set("Cookie", CSRF_COOKIE)
        .set("X-CSRF-Token", CSRF_HEADER)
        .set("x-strong-room-terminal-token", "AMCEC-STRONGROOM-SECURE-TERMINAL-2026")
        .send({ shares: threeShares });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.paper.setName).toBe("Set A");
      expect(res.body.unsealingSessionToken).toBeDefined();
    });
  });

  describe("POST /api/v1/vault/papers/:formId/print", () => {
    it("generates printed copies with dynamic forensic watermarks", async () => {
      (prisma.paperForm.findUnique as any).mockResolvedValue({
        id: 1,
        setName: "Set A",
        blueprint: {
          courseOffering: { course: { courseCode: "22CS61" } }
        },
        snapshots: []
      });

      const res = await request(app)
        .post("/api/v1/vault/papers/1/print")
        .set("Authorization", getAuthHeader(1, "controller"))
        .set("Cookie", CSRF_COOKIE)
        .set("X-CSRF-Token", CSRF_HEADER)
        .set("x-strong-room-terminal-token", "AMCEC-STRONGROOM-SECURE-TERMINAL-2026")
        .send({ copyCount: 3 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.copies).toHaveLength(3);
      expect(res.body.copies[0].serial).toContain("AMCEC-SEE-22CS61-COPY#0001");
      expect(res.body.copies[0].forensicWatermark).toContain("TERMINAL IP");
    });
  });
});
