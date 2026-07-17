import request from "supertest";
import { describe, expect, it } from "vitest";

describe("health", () => {
  it("returns liveness", async () => {
    process.env.DATABASE_URL = "postgresql://qpset:qpset@localhost:5432/qpset?schema=public";
    process.env.JWT_ACCESS_SECRET = "test-access-secret-minimum-32-characters";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";
    const { createApp } = await import("../src/app.js");
    const res = await request(createApp()).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
