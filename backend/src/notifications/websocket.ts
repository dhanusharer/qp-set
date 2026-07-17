import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import url from "url";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  role?: string;
}

const clients = new Set<AuthenticatedWebSocket>();

export function createNotificationServer(httpServer: any) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request: any, socket: any, head: any) => {
    const pathname = url.parse(request.url).pathname;

    if (pathname === "/notifications") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws: AuthenticatedWebSocket, request: any) => {
    let token: string | undefined;

    // Extract token from Cookie header if available
    const cookiesHeader = request.headers.cookie || "";
    const cookieToken = cookiesHeader
      .split(";")
      .map((c: string) => c.trim().split("="))
      .find((parts: string[]) => parts[0] === "accessToken");

    if (cookieToken && cookieToken.length === 2) {
      token = cookieToken[1];
    }

    // Fall back to query parameter token
    if (!token) {
      const parsedUrl = url.parse(request.url, true);
      token = parsedUrl.query.token as string;
    }

    if (!token) {
      ws.close(4001, "Unauthorized: missing token");
      return;
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
      ws.userId = payload.sub;
      ws.role = payload.role;
      clients.add(ws);
      logger.debug({ userId: ws.userId, role: ws.role }, "WebSocket client connected");
    } catch (err) {
      ws.close(4002, "Unauthorized: invalid token");
      return;
    }

    ws.on("close", () => {
      clients.delete(ws);
      logger.debug({ userId: ws.userId }, "WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      clients.delete(ws);
      logger.error({ err }, "WebSocket client error");
    });
  });
}

export function sendRealtimeNotification(
  filter: (client: { userId?: number; role?: string }) => boolean,
  payload: any
) {
  const message = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN && filter(client)) {
      client.send(message);
    }
  }
}
