import type { Request, Response } from "express";
import client from "prom-client";

client.collectDefaultMetrics();

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

export function metricsHandler(_req: Request, res: Response) {
  res.set("Content-Type", client.register.contentType);
  client.register.metrics().then((body) => res.end(body));
}
