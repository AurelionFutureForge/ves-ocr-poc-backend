import { Request, Response, NextFunction } from 'express';
import * as OcrService from '@/v1/services/ocr.service';
import { FormParserService } from '@/v1/services/form-parser.service';
import { sendResponse } from '@/v1/utils';
import { AppError } from '@/v1/middlewares/errorHandler.middleware';

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
