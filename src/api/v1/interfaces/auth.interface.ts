import { DefaultResponse } from "./http.interface";

export type Role = "ADMIN" | "SUPER_ADMIN";

export interface AuthRegister {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface TokenData {
  access_token: string;
  refresh_token: string | null;
}

export interface AuthRefreshTokenResponse extends DefaultResponse {
  data: {
    access_token: string;
  };
}

export interface AuthResetPasswordResponse extends DefaultResponse {
  data: {
    message: string;
  };
}

export interface AuthVerifyResetTokenResponse {
  data: {
    token_id: string;
    token_expires: Date;
    user_id: string;
  };
}

export interface AuthStoreResetTokenResponse {
  data: {
    token_id: string;
  };
}
