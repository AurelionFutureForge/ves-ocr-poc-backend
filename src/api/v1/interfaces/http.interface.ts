import { Request as ExpressRequest } from "express";

export interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    user_id: string;
  };
}

// Standardized pagination interface
export interface PaginationMeta {
  next_cursor: string | null;
  has_next_page: boolean;
  limit: number;
  total_count?: number; // Optional for cursor-based pagination
  total_pages?: number; // Optional for page-based pagination
  current_page?: number; // Optional for page-based pagination
}

// Standardized service response interface with pagination (without status/success/message)
export interface PaginatedServiceResponse<T = any> {
  data: T;
  meta: {
    pagination: PaginationMeta;
  };
}

// Standardized response interface with pagination (for controllers)
export interface PaginatedResponse<T = any> {
  status: number;
  success: boolean;
  message: string;
  data: T;
  meta: {
    pagination: PaginationMeta;
  };
}

// Standardized response interface without pagination
export interface DefaultResponse {
  status: number;
  success: boolean;
  message: string;
  data?: any;
}