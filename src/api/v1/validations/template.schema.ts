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

