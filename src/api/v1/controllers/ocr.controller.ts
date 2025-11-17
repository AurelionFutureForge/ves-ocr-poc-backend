import { Request, Response, NextFunction } from 'express';
import * as OcrService from '@/v1/services/ocr.service';
import * as TemplateService from '@/v1/services/template.service';
import { FormParserService } from '@/v1/services/form-parser.service';
import { sendResponse } from '@/v1/utils';
import { AppError } from '@/v1/middlewares/errorHandler.middleware';
import logger from '@/v1/utils/logger';

// Process OCR from uploaded file
export const processOcrController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Get parameters (optional)
    const language = (req.body.language as string) || 'eng';
    const preprocess = req.body.preprocess !== 'false'; // Default true, set to false if explicitly passed
    const parseForm = req.body.parseForm === 'true'; // Parse as structured form
    const format = (req.body.format as string) || 'json'; // json, csv, excel

    // Process OCR with preprocessing
    const response = await OcrService.processOcr(req.file, language, preprocess);
    
    // If form parsing is requested, parse the OCR text
    if (parseForm && response.success) {
      const parsedData = FormParserService.parsePoliceReport(response.data.text);
      
      // Return in requested format
      if (format === 'csv') {
        const csv = FormParserService.toCSV(parsedData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=crash-report.csv');
        return res.send(csv);
      } else if (format === 'text' || format === 'report') {
        const textReport = FormParserService.toTextReport(parsedData);
        res.setHeader('Content-Type', 'text/plain');
        return res.send(textReport);
      } else if (format === 'excel') {
        const excelData = FormParserService.toExcelJSON(parsedData);
        return sendResponse(res, 200, true, 'Form parsed successfully', {
          ...response.data,
          parsedData,
          excelData
        });
      } else {
        // JSON format
        return sendResponse(res, 200, true, 'Form parsed successfully', {
          ...response.data,
          parsedData
        });
      }
    }
    
    sendResponse(res, response.status, response.success, response.message, response.data);
  } catch (error) {
    next(error);
  }
};

// Extract template fields from uploaded images or multi-part upload
// Simplified API: Frontend splits PDF into pages and converts to images
// Backend receives multiple images and produces one Excel sheet
export const extractTemplateFieldsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Support both single file upload and multi-file upload
    const files = req.files as Express.Multer.File[] || (req.file ? [req.file] : []);
    
    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const { templateId, language = 'eng', aggressive = true } = req.body;

    if (!templateId) {
      throw new AppError('Missing required parameter: templateId', 400);
    }

    logger.info(`📋 Extracting fields for template: ${templateId}`);
    logger.info(`📁 Received ${files.length} image(s) from frontend`);

    // Step 1: Fetch template and all fields from database
    const templateResponse = await TemplateService.getTemplateById(templateId);
    
    if (!templateResponse || !templateResponse.data) {
      throw new AppError(`Template not found: ${templateId}`, 404);
    }

    const template = templateResponse.data;
    const templateFields = template.fields;
    logger.info(`✓ Found ${templateFields.length} fields in template "${template.name}"`);

    // Step 2: Process each image (each page) and extract fields
    const pageResults: any[] = [];
    const allExtractedFields: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const currentPageNum = i + 1;
      
      logger.info(`📄 Processing page ${currentPageNum}/${files.length}...`);

      // Get fields for this page
      const fieldsOnPage = templateFields.filter((f: any) => f.page_number === currentPageNum);
      
      if (fieldsOnPage.length === 0) {
        logger.info(`⊘ Page ${currentPageNum}: No fields defined, skipping`);
        continue;
      }

      logger.info(`📄 Page ${currentPageNum}: Extracting ${fieldsOnPage.length} fields...`);

      // Extract fields from this page image
      const pageExtractedFields = await OcrService.extractTemplateFields(
        file.buffer,
        currentPageNum,
        fieldsOnPage,
        language,
        aggressive === 'true' || aggressive === true
      );

      pageResults.push({
        pageNumber: currentPageNum,
        fields: pageExtractedFields
      });

      allExtractedFields.push(...pageExtractedFields);
      
      const successCount = pageExtractedFields.filter((f: any) => f.raw_text).length;
      logger.info(`✓ Page ${currentPageNum}: ${successCount}/${fieldsOnPage.length} fields extracted`);
    }

    // Step 3: Generate ONE Excel sheet with all extracted data
    const excel = generateExcelData(allExtractedFields, template.name);

    // Return combined results
    const response = {
      templateId,
      templateName: template.name,
      totalPages: files.length,
      totalFields: allExtractedFields.length,
      successfulExtractions: allExtractedFields.filter((f: any) => f.raw_text).length,
      fileType: 'images',
      extractedFields: allExtractedFields,
      pageResults: pageResults,
      excel: excel // ← ONE Excel sheet with all pages
    };

    logger.info(`✅ Extraction complete: ${response.successfulExtractions}/${response.totalFields} fields extracted from ${files.length} pages`);

    sendResponse(res, 200, true, 'Template extraction completed successfully', response);
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------
   GENERATE EXCEL DATA
---------------------------------------------------------*/
function generateExcelData(extractedFields: any[], templateName: string): any {
  try {
    // Format for Excel export
    const excelRows = extractedFields.map((field) => ({
      'Field Name': field.field_name,
      'Extracted Text': field.raw_text || '---',
      'Confidence %': field.confidence || 0,
      'Status': field.raw_text ? '✓ Found' : '✗ Not Found',
      'Notes': field.notes || ''
    }));

    return {
      sheetName: `${templateName} - Extract`,
      data: excelRows,
      filename: `${templateName}_extracted_${new Date().toISOString().split('T')[0]}.xlsx`
    };
  } catch (error: any) {
    logger.error('Error generating Excel data:', error);
    throw error;
  }
}