import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./db.js";
import { createApp } from "./app.js";
import { createNotificationServer } from "./notifications/websocket.js";

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "QPSet backend listening");
});

createNotificationServer(server);

// Unlock all user accounts on startup to prevent lockouts during development/testing
async function unlockAllUsers() {
  try {
    await prisma.user.updateMany({
      data: {
        failedAttempts: 0,
        lockoutUntil: null
      }
    });
    logger.info("All user accounts unlocked on startup");
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to unlock user accounts on startup");
  }
}
unlockAllUsers();

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
