import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    env: {
      DATABASE_URL: "postgresql://qpset:qpset@localhost:5432/qpset?schema=public",
      JWT_ACCESS_SECRET: "test-access-secret-minimum-32-characters",
      JWT_REFRESH_SECRET: "test-refresh-secret-minimum-32-characters",
      JWT_ACCESS_TTL: "15m",
      JWT_REFRESH_TTL: "7d",
      BCRYPT_ROUNDS: "10"
    }
  }
});
