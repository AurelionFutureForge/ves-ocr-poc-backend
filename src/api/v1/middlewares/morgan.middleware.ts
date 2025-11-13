import morgan, { StreamOptions } from "morgan";
import logger from '@/v1/utils/logger';
import { env } from "@config/env/env";

const stream: StreamOptions = {
  write: (message) => logger.info(message.trim()), // Pass morgan logs to winston
};

const morganMiddleware = morgan(
  env.NODE_ENV === "production"
    ? ":method :url :status :response-time ms" // Simplified format for production
    : ":method :url :status :response-time ms - :res[content-length]", // More detailed for dev
  { stream }
);

export default morganMiddleware;