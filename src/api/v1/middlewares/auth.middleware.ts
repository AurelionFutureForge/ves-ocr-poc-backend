require("dotenv").config();
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@/v1/interfaces";
import { verifyAccessToken } from "@/v1/utils";
import { AppError } from "./errorHandler.middleware";

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next(new AppError("Access token is missing", 401));
  }
  try {
    const decoded: any = await verifyAccessToken(token);
    const user_id = decoded.user_id;
    if (!user_id ) {
      return next(new AppError("Data is missing in token", 400));
    }

    req.user = { 
      user_id
    };
    next();
  } catch (err) {
    return next(new AppError("Invalid access token", 403));
  }
};
