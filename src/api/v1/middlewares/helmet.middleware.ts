import helmet, { HelmetOptions } from "helmet";

const helmetConfig: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
};

const helmetMiddleware = helmet(helmetConfig);

export default helmetMiddleware;
