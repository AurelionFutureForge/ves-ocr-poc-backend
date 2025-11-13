import { Request, Response, NextFunction } from 'express';
import { GetTemplatesSchema, GetTemplateByIdSchema, UpdateTemplateSchema } from '@/v1/validations';
import { TemplateService } from '@/v1/services';
import { sendResponse } from '@/v1/utils';

// Get all templates
export const getAllTemplatesController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, q } = GetTemplatesSchema.parse({ query: req.query });
    const response = await TemplateService.getAllTemplates(limit, cursor, q);
    sendResponse(res, response.status, response.success, response.message, response.data);
  } catch (error) {
    next(error);
  }
};

// Get template by ID
export const getTemplateByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { template_id } = GetTemplateByIdSchema.parse({ params: req.params });
    const response = await TemplateService.getTemplateById(template_id);
    sendResponse(res, response.status, response.success, response.message, response.data);
  } catch (error) {
    next(error);
  }
};

// Update template
export const updateTemplateController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { template_id, name, description, pdf_url } = UpdateTemplateSchema.parse({ params: req.params, body: req.body });
    const response = await TemplateService.updateTemplate(template_id, name, description, pdf_url);
    sendResponse(res, response.status, response.success, response.message, response.data);
  } catch (error) {
    next(error);
  }
};