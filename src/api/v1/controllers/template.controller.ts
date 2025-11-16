import { Request, Response, NextFunction } from 'express';
import { GetTemplatesSchema, GetTemplateByIdSchema, UpdateTemplateSchema, AddTemplateFieldSchema, UpdateTemplateFieldSchema, DeleteTemplateFieldSchema } from '@/v1/validations';
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

// Add template field
export const addTemplateFieldController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { template_id, field_name, label, page_number, x_norm, y_norm, w_norm, h_norm, sample_value, sample_extracted_value } = 
      AddTemplateFieldSchema.parse({ params: req.params, body: req.body });
    const response = await TemplateService.addTemplateField(
      template_id, 
      field_name, 
      label, 
      page_number, 
      x_norm, 
      y_norm, 
      w_norm, 
      h_norm, 
      sample_value,
      sample_extracted_value
    );
    sendResponse(res, response.status, response.success, response.message, response.data);
  } catch (error) {
    next(error);
  }
};

// Update template field
export const updateTemplateFieldController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { template_id, field_id, field_name, label, page_number, x_norm, y_norm, w_norm, h_norm, sample_value, sample_extracted_value } = 
      UpdateTemplateFieldSchema.parse({ params: req.params, body: req.body });
    const response = await TemplateService.updateTemplateField(
      template_id, 
      field_id, 
      field_name, 
      label, 
      page_number, 
      x_norm, 
      y_norm, 
      w_norm, 
      h_norm, 
      sample_value,
      sample_extracted_value
    );
    sendResponse(res, response.status, response.success, response.message, response.data);
  } catch (error) {
    next(error);
  }
};

// Delete template field
export const deleteTemplateFieldController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { template_id, field_id } = DeleteTemplateFieldSchema.parse({ params: req.params });
    
    const response = await TemplateService.deleteTemplateField(
      template_id, 
      field_id
    );
    sendResponse(res, response.status, response.success, response.message, response.data);
  } catch (error) {
    next(error);
  }
};

// Extract OCR from template fields
export const extractOcrFromTemplateController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { template_id } = req.params;
    const aggressive = req.body?.aggressive === true;

    // Validate template_id
    if (!template_id || typeof template_id !== 'string') {
      throw new Error('Invalid template_id');
    }

    // Get file from request
    if (!req.file) {
      throw new Error('No file uploaded. Please provide an image or PDF file.');
    }

    const response = await TemplateService.extractOcrFromTemplate(
      template_id,
      req.file.buffer,
      aggressive
    );
    sendResponse(res, response.status, response.success, response.message, response.data);
  } catch (error) {
    next(error);
  }
};