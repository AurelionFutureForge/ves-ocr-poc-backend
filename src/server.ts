import { env } from "@config/env/env";
import createApp from "./api/v1/app";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const port = env.PORT;

const startServer = async () => {
  try {
    const { server } = await createApp();
    
    server.listen(port, () => {
      console.log(`🚀 Server running at: http://localhost:${port}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle process-level events
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Start the server
startServer();
