import express, { Express, NextFunction, Request, Response } from "express";
import compression from "compression";
import swaggerUI from "swagger-ui-express";
import * as Sentry from "@sentry/node";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
// import { nodeProfilingIntegration } from "@sentry/profiling-node";
import http from "http";

import helmetMiddleware from "./middlewares/helmet.middleware";
import corsMiddleware from "./middlewares/cors.middleware";
import morganMiddleware from "./middlewares/morgan.middleware";
// import limiter from "./middlewares/rateLimiter.middlerware";
import { errorMiddleware, AppError } from "./middlewares/errorHandler.middleware";
import { env } from "process";
import logger from "./utils/logger";
import ApiRouter from "@/v1/routers";

// Load environment variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"] });

// Create Express application
const createApp = async (): Promise<{ app: Express; server: http.Server }> => {
  const app: Express = express();
  const server = http.createServer(app);

  // Security and performance middleware
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1); // Trust *only the first proxy* (e.g., Railway, Render, Heroku)
  }
  app.use(helmetMiddleware);
  app.use(compression());

  // Morgan middleware for logging HTTP requests with response time
  app.use(morganMiddleware);

  // Rate limiting middleware
  // app.use(limiter);

  // Parsing middleware
  app.use(
    express.json({
      limit: "1mb", // Limit payload size
    })
  );
  app.use(express.urlencoded({ extended: true }));

  app.use(corsMiddleware);

  // Sentry initialization
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app }),
        // nodeProfilingIntegration() // Commented out due to version compatibility issues
      ],
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      profilesSampleRate: 0.1,
    });
  }

  // Sentry request handlers
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // Swagger documentation setup for Auth Microservice
  try {
    const YAML = await import("yamljs");
    const path = await import("path");
    const swaggerWebDocs = YAML.load(
      path.resolve(
        __dirname,
        "../../config/swagger/swagger-admin-microservice.yaml"
      )
    );
    app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerWebDocs));
  } catch (error) {
    console.error(
      "Failed to load Swagger documentation for Auth Microservice",
      error
    );
  }

  // Basic health check route
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      message: "VES-OCR Backend API-V1 Working",
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      message: "VES-OCR Backend API-V1 Working",
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use("/api/v1", ApiRouter);

  // Graceful shutdown function
  const gracefulShutdown = async () => {
    logger.info("Shutting down gracefully...");

    // Close Prisma connection
    await prisma.$disconnect();

    logger.info("All connections closed");
    process.exit(0);
  };

  // Set up graceful shutdown handlers
  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);

  // Catch-all route for undefined routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Route ${req.originalUrl} not found`, 404));
  });

  // Error handling middleware
  app.use(errorMiddleware);

  // Sentry error handler
  app.use(Sentry.Handlers.errorHandler());

  // Unhandled rejection and exception handling
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Optionally exit the process
    // process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Optionally exit the process
    // process.exit(1);
  });

  return { app, server };
};

export default createApp;
