import cors, { CorsOptions } from "cors";
import { env } from "@config/env/env";

// CORS configuration
const allowedOrigins = env.ALLOWED_ORIGINS

const corsOptions: CorsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const msg =
      "The CORS policy for this site does not allow access from the specified origin.";
    return callback(new Error(msg), false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// Export CORS middleware
const corsMiddleware = cors(corsOptions);

export default corsMiddleware;