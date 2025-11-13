require("dotenv").config();
import { env } from "@config/env/env";
import jwt from "jsonwebtoken";

export const verifyAccessToken = async (token: string) => {
  try {
    return await jwt.verify(token, env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw error;
  }
};