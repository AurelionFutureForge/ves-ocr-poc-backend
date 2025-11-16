import { z } from 'zod';

// Get all templates schema
export const GetTemplatesSchema = z.object({
  query: z.object({
    limit: z.coerce.number().min(1, "limit must be at least 1").max(100, "Limit cannot exceed 100").optional(),
    cursor: z.string().optional(),
    q: z.string().min(1, "Search query must not be empty").optional(),
  }),
}).transform(({ query }) => ({
  limit: query.limit,
  cursor: query.cursor,
  q: query.q,
}));

// Get template by ID schema
export const GetTemplateByIdSchema = z.object({
  params: z.object({
    template_id: z.string().uuid("Invalid template ID format"),
  }),
}).transform(({ params }) => ({
  template_id: params.template_id,
}));

// Update template schema
export const UpdateTemplateSchema = z.object({
  params: z.object({
    template_id: z.string().uuid("Invalid template ID format"),
  }),
  body: z.object({
    name: z.string().min(1, "Template name cannot be empty").optional(),
    description: z.string().optional(),
    pdf_url: z.string().url("Invalid PDF URL").optional(),
  }),
}).transform(({ params, body }) => ({
  template_id: params.template_id,
  name: body.name,
  description: body.description,
  pdf_url: body.pdf_url,
}));

// Add template field schema
export const AddTemplateFieldSchema = z.object({
  params: z.object({
    template_id: z.string().uuid("Invalid template ID format"),
  }),
  body: z.object({
    field_name: z.string().min(1, "Field name cannot be empty"),
    label: z.string().optional(),
    page_number: z.number().int().min(1, "Page number must be at least 1"),
    x_norm: z.number().min(0, "X coordinate must be non-negative").max(1, "X coordinate must be between 0 and 1"),
    y_norm: z.number().min(0, "Y coordinate must be non-negative").max(1, "Y coordinate must be between 0 and 1"),
    w_norm: z.number().min(0.001, "Width must be greater than 0").max(1, "Width must be between 0 and 1"),
    h_norm: z.number().min(0.001, "Height must be greater than 0").max(1, "Height must be between 0 and 1"),
    sample_value: z.string().optional(),
    sample_extracted_value: z.string().optional(),
    confidence_score: z.number().min(0, "Confidence score must be between 0 and 100").max(100, "Confidence score must be between 0 and 100").optional(),
    field_status: z.enum(["pending", "good", "low_confidence", "no_data"]).optional(),
    notes: z.string().optional(),
  }),
}).transform(({ params, body }) => ({
  template_id: params.template_id,
  field_name: body.field_name,
  label: body.label,
  page_number: body.page_number,
  x_norm: body.x_norm,
  y_norm: body.y_norm,
  w_norm: body.w_norm,
  h_norm: body.h_norm,
  sample_value: body.sample_value,
  sample_extracted_value: body.sample_extracted_value,
  confidence_score: body.confidence_score,
  field_status: body.field_status,
  notes: body.notes,
}));

// Update template field schema
export const UpdateTemplateFieldSchema = z.object({
  params: z.object({
    template_id: z.string().uuid("Invalid template ID format"),
    field_id: z.string().uuid("Invalid field ID format"),
  }),
  body: z.object({
    field_name: z.string().min(1, "Field name cannot be empty").optional(),
    label: z.string().optional(),
    page_number: z.number().int().min(1, "Page number must be at least 1").optional(),
    x_norm: z.number().min(0, "X coordinate must be non-negative").max(1, "X coordinate must be between 0 and 1").optional(),
    y_norm: z.number().min(0, "Y coordinate must be non-negative").max(1, "Y coordinate must be between 0 and 1").optional(),
    w_norm: z.number().min(0.001, "Width must be greater than 0").max(1, "Width must be between 0 and 1").optional(),
    h_norm: z.number().min(0.001, "Height must be greater than 0").max(1, "Height must be between 0 and 1").optional(),
    sample_value: z.string().optional(),
    sample_extracted_value: z.string().optional(),
    confidence_score: z.number().min(0, "Confidence score must be between 0 and 100").max(100, "Confidence score must be between 0 and 100").optional(),
    field_status: z.enum(["pending", "good", "low_confidence", "no_data"]).optional(),
    notes: z.string().optional(),
  }).refine((data) => Object.keys(data).length > 0, "At least one field must be provided for update"),
}).transform(({ params, body }) => ({
  template_id: params.template_id,
  field_id: params.field_id,
  field_name: body.field_name,
  label: body.label,
  page_number: body.page_number,
  x_norm: body.x_norm,
  y_norm: body.y_norm,
  w_norm: body.w_norm,
  h_norm: body.h_norm,
  sample_value: body.sample_value,
  sample_extracted_value: body.sample_extracted_value,
  confidence_score: body.confidence_score,
  field_status: body.field_status,
  notes: body.notes,
}));

// Delete template field schema
export const DeleteTemplateFieldSchema = z.object({
  params: z.object({
    template_id: z.string().uuid("Invalid template ID format"),
    field_id: z.string().uuid("Invalid field ID format"),
  }),
}).transform(({ params }) => ({
  template_id: params.template_id,
  field_id: params.field_id,
}));

// Verify field OCR schema
export const VerifyFieldOcrSchema = z.object({
  params: z.object({
    template_id: z.string().uuid("Invalid template ID format"),
    field_id: z.string().uuid("Invalid field ID format"),
  }),
  body: z.object({
    aggressive: z.boolean().optional(),
  }),
}).transform(({ params, body }) => ({
  template_id: params.template_id,
  field_id: params.field_id,
  aggressive: body.aggressive ?? false,
}));
