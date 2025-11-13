require('dotenv').config();
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as Sentry from "@sentry/node";
import { env } from '@config/env/env';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const formatErrorMessage = (message: string) => ({ error: message });

export const sendErrorDev = (err: Error, res: Response, next: NextFunction) => {
  const statusCode = (err as AppError).statusCode || 500;

  if (err instanceof ZodError) {
    // Check if this is a missing user_id error
    const userIdError = err.errors.find(e =>
      e.path.includes('user_id') &&
      (e.message === 'Required' || e.message === 'User ID is required')
    );

    if (userIdError) {
      res.status(422).json({
        success: false,
        message: {
          error: "user_id is required"
        },
        stack: err.stack
      });
    } else {
      const errorMessages = err.errors.map((validationError) => {
        const fieldName = validationError.path.join('.');
        return `Invalid value for '${fieldName}': ${validationError.message}.`;
      }).join(' ');
      res.status(422).json({ success: false, message: formatErrorMessage(errorMessages), stack: err.stack });
    }
  } else {
    res.status(statusCode).json({
      success: false,
      message: formatErrorMessage(err.message),
      stack: err.stack,
    });
  }
};

export const sendErrorProd = (err: Error, res: Response, next: NextFunction) => {
  const statusCode = (err as AppError).statusCode || 500;

  if (err instanceof ZodError) {
    // Check if this is a missing user_id error
    const userIdError = err.errors.find(e =>
      e.path.includes('user_id') &&
      (e.message === 'Required' || e.message === 'User ID is required')
    );

    if (userIdError) {
      res.status(422).json({
        success: false,
        message: {
          error: "user_id is required"
        }
      });
    } else {
      const errorMessages = err.errors.map((validationError) => {
        const fieldName = validationError.path.join('.');
        return `Invalid value for '${fieldName}': ${validationError.message}.`;
      }).join(' ');
      res.status(422).json({ success: false, message: formatErrorMessage(errorMessages) });
    }
  } else if ((err as AppError).isOperational) {
    res.status(statusCode).json({
      success: false,
      message: formatErrorMessage(err.message),
    });
  } else {
    res.status(statusCode).json({
      success: false,
      message: formatErrorMessage('Something went wrong. Please try again later.'),
    });
  }
};

export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  Sentry.captureException(err);

  if (env.NODE_ENV === 'development') {
    sendErrorDev(err, res, next);
  } else {
    sendErrorProd(err, res, next);
  }
};
