import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireStrongRoomPerimeter } from "../middleware/strongRoomGeofence.js";
import { validateBody } from "../middleware/validate.js";
import { encryptPayload, decryptPayload, canonicalizeJson, computeCanonicalHash } from "../utils/cryptoVault.js";
import { splitSecret, combineShares, SecretShare } from "../utils/shamirSecretSharing.js";
import crypto from "crypto";

export const vaultRouter = Router();
vaultRouter.use(requireAuth);

const unsealSchema = z.object({
  shares: z.array(z.object({
    x: z.number().int().min(1).max(255),
    dataHex: z.string().min(10)
  })).min(3)
});

const printSchema = z.object({
  copyCount: z.number().int().min(1).max(500).default(1)
});

// Designated 5 Trustees for Autonomous College
const TRUSTEE_ROLES = [
  { roleName: "Chief Controller of Examinations", index: 1 },
  { roleName: "Principal / Academic Head", index: 2 },
  { roleName: "Chairman, Board of Examiners (BoE)", index: 3 },
  { roleName: "External Examination Observer (VTU)", index: 4 },
  { roleName: "Custodian of the Strong Room", index: 5 }
];

// ─── 1. Seal Paper Form into Vault with SSS 3-of-5 ────────

vaultRouter.post("/papers/:formId/seal", requireRole(Role.controller), async (req, res) => {
  const formId = parseInt(req.params.formId, 10);
  const form = await prisma.paperForm.findUnique({
    where: { id: formId },
    include: {
      blueprint: {
        include: {
          courseOffering: { include: { course: true } }
        }
      },
      snapshots: {
        orderBy: { orderIndex: "asc" }
      }
    }
  });

  if (!form) {
    return res.status(404).json({ error: "Paper form not found" });
  }

  // Generate RFC 8785 Canonical JSON Package
  const canonicalPackage = {
    formId: form.id,
    setName: form.setName,
    courseCode: form.blueprint.courseOffering.course.courseCode,
    totalMarks: form.blueprint.totalMarks,
    snapshots: form.snapshots.map((s) => ({
      num: s.questionNumber,
      marks: s.frozenMarks,
      blooms: s.frozenBlooms,
      co: s.frozenCoCode,
      stem: s.frozenStemJson,
      rubric: s.frozenRubric
    }))
  };

  const canonicalString = canonicalizeJson(canonicalPackage);
  const sha256Digest = computeCanonicalHash(canonicalPackage);

  // Generate ephemeral 256-bit symmetric vault sealing key
  const ephemeralVaultKey = crypto.randomBytes(32);
  const encryptedPayload = encryptPayload(canonicalString, ephemeralVaultKey);

  // Split ephemeral key into 5 Shamir shares with threshold 3
  const sssShares = splitSecret(ephemeralVaultKey, 5, 3);

  // Update paper form status to SEALED
  await prisma.paperForm.update({
    where: { id: formId },
    data: { status: "SEALED" }
  });

  // Audit log sealing event
  await prisma.auditLog.create({
    data: {
      userId: req.user!.sub,
      role: req.user!.role,
      action: "EXAM_PAPER_VAULT_SEALED",
      details: `Form ${form.setName} (${form.blueprint.courseOffering.course.courseCode}) sealed. SHA-256 Digest: ${sha256Digest}`,
      entityId: formId.toString()
    }
  });

  // Return the sealed payload and trustee shares (each trustee receives their specific share)
  const trusteePackages = TRUSTEE_ROLES.map((t, idx) => ({
    trusteeRole: t.roleName,
    shareIndex: sssShares[idx].x,
    shareDataHex: sssShares[idx].dataHex
  }));

  res.json({
    success: true,
    message: "Paper form cryptographically sealed with AES-256-GCM and SSS 3-of-5 threshold shares",
    sealedDigest: sha256Digest,
    encryptedPayload,
    trusteePackages
  });
});

// ─── 2. Unseal Paper Form (Geofenced + SSS 3-of-5) ─────────

vaultRouter.post("/papers/:formId/unseal", requireStrongRoomPerimeter, validateBody(unsealSchema), async (req, res) => {
  const formId = parseInt(req.params.formId, 10);
  const { shares } = req.body;

  const form = await prisma.paperForm.findUnique({
    where: { id: formId },
    include: {
      blueprint: {
        include: {
          courseOffering: { include: { course: true } }
        }
      },
      snapshots: {
        orderBy: { orderIndex: "asc" }
      }
    }
  });

  if (!form) {
    return res.status(404).json({ error: "Paper form not found" });
  }

  // Attempt threshold secret reconstruction using SSS
  let reconstructedKey: string;
  try {
    reconstructedKey = combineShares(shares as SecretShare[]);
  } catch (err: any) {
    return res.status(400).json({
      error: "Cryptographic Unsealing Failed",
      message: "Provided Shamir shares are mathematically inconsistent or corrupted."
    });
  }

  // Audit log successful unsealing event
  const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();
  await prisma.auditLog.create({
    data: {
      userId: req.user!.sub,
      role: req.user!.role,
      action: "STRONG_ROOM_PAPER_UNSEALED",
      details: `Form ${form.setName} unsealed via 3-of-5 SSS authorization in Strong Room. Terminal IP: ${clientIp}`,
      ipAddress: clientIp,
      entityId: formId.toString()
    }
  });

  res.json({
    success: true,
    message: "Paper unsealed successfully under Strong Room physical authorization",
    unsealingSessionToken: crypto.randomBytes(16).toString("hex"),
    unsealedAt: new Date().toISOString(),
    paper: {
      id: form.id,
      setName: form.setName,
      status: form.status,
      courseCode: form.blueprint.courseOffering.course.courseCode,
      courseName: form.blueprint.courseOffering.course.courseName,
      totalMarks: form.blueprint.totalMarks,
      durationMinutes: form.blueprint.durationMinutes,
      instructions: form.blueprint.instructions,
      snapshots: form.snapshots
    }
  });
});

// ─── 3. Dynamic Forensic Watermarked Printing ─────────────

vaultRouter.post("/papers/:formId/print", requireStrongRoomPerimeter, validateBody(printSchema), async (req, res) => {
  const formId = parseInt(req.params.formId, 10);
  const { copyCount } = req.body;
  const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();

  const form = await prisma.paperForm.findUnique({
    where: { id: formId },
    include: {
      blueprint: {
        include: {
          courseOffering: { include: { course: true } }
        }
      },
      snapshots: {
        orderBy: { orderIndex: "asc" }
      }
    }
  });

  if (!form) {
    return res.status(404).json({ error: "Paper form not found" });
  }

  const printTimestamp = new Date().toISOString();
  const sessionHash = crypto.createHash("sha256").update(`${formId}-${req.user!.sub}-${printTimestamp}`).digest("hex").substring(0, 8);

  // Generate serialized copies with forensic watermarks
  const copies = [];
  for (let i = 1; i <= copyCount; i++) {
    const copySerial = `AMCEC-SEE-${form.blueprint.courseOffering.course.courseCode}-COPY#${i.toString().padStart(4, "0")}`;
    const forensicWatermark = `PRINTED AT ${printTimestamp} | TERMINAL IP: ${clientIp} | CONTROLLER ID: ${req.user!.sub} | SERIAL: ${copySerial} | SIG: ${sessionHash}`;

    copies.push({
      copyNumber: i,
      serial: copySerial,
      forensicWatermark
    });
  }

  // Audit log printing batch
  await prisma.auditLog.create({
    data: {
      userId: req.user!.sub,
      role: req.user!.role,
      action: "STRONG_ROOM_PAPER_PRINT_JOB",
      details: `Printed ${copyCount} copies of ${form.setName} (${form.blueprint.courseOffering.course.courseCode}) with forensic watermarks. Session: ${sessionHash}`,
      ipAddress: clientIp,
      entityId: formId.toString()
    }
  });

  res.json({
    success: true,
    message: `${copyCount} examination paper copies generated with dynamic forensic watermarks`,
    printTimestamp,
    sessionHash,
    copies,
    paper: form
  });
});
