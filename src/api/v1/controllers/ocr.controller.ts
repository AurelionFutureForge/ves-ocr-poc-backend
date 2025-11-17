import { Request, Response, NextFunction } from 'express';
import * as OcrService from '@/v1/services/ocr.service';
import * as TemplateService from '@/v1/services/template.service';
import { FormParserService } from '@/v1/services/form-parser.service';
import { sendResponse } from '@/v1/utils';
import { AppError } from '@/v1/middlewares/errorHandler.middleware';
import logger from '@/v1/utils/logger';
import ExcelJS from 'exceljs';

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

    const excelData = await generateExcelFile(allExtractedFields, template.name, pageResults);

    // Step 3: Generate ONE Excel sheet with all extracted data
    const excelBuffer = await generateExcelFile(allExtractedFields, template.name, pageResults);

    // Create response object with metadata
    const response = {
      templateId,
      templateName: template.name,
      totalPages: files.length,
      totalFields: allExtractedFields.length,
      successfulExtractions: allExtractedFields.filter((f: any) => f.raw_text).length,
      fileType: 'images',
      extractedFields: allExtractedFields,
      pageResults: pageResults,
      excelData: excelData,
      excel: {
        filename: `${template.name}_extracted_${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: `${template.name} - Extract`,
        rows: allExtractedFields.length
      }
    };

    logger.info(`✅ Extraction complete: ${response.successfulExtractions}/${response.totalFields} fields extracted from ${files.length} pages`);
    logger.info(`📊 Excel file generated: ${response.excel.filename}`);

    // Send the Excel file as download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${response.excel.filename}"`);
    res.setHeader('X-Extraction-Data', JSON.stringify(response));
    
    return res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------
   GENERATE EXCEL FILE using ExcelJS
---------------------------------------------------------*/
async function generateExcelFile(
  extractedFields: any[],
  templateName: string,
  pageResults: any[]
): Promise<Buffer> {
  try {
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    
    // Add main extraction sheet
    const extractSheet = workbook.addWorksheet(`${templateName} - Extract`);
    
    // Define columns
    extractSheet.columns = [
      { header: 'Field Name', key: 'field_name', width: 25 },
      { header: 'Extracted Text', key: 'raw_text', width: 40 },
      { header: 'Confidence %', key: 'confidence', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Page', key: 'page', width: 10 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];

    // Style header row
    const headerRow = extractSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    headerRow.alignment = { horizontal: 'center' as any, vertical: 'middle', wrapText: true };

    // Add data rows with formatting
    extractedFields.forEach((field, index) => {
      // Find which page this field belongs to
      let pageNum = 1;
      for (const pageResult of pageResults) {
        const found = pageResult.fields.find((f: any) => f.field_id === field.field_id);
        if (found) {
          pageNum = pageResult.pageNumber;
          break;
        }
      }

      const row = extractSheet.addRow({
        field_name: field.field_name,
        raw_text: field.raw_text || '---',
        confidence: field.confidence || 0,
        status: field.raw_text ? '✓ Found' : '✗ Not Found',
        page: pageNum,
        notes: field.notes || ''
      });

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }

      // Center align certain columns
      row.getCell('confidence').alignment = { horizontal: 'center' };
      row.getCell('page').alignment = { horizontal: 'center' };
      row.getCell('status').alignment = { horizontal: 'center' };

      // Color status based on extraction
      if (field.raw_text) {
        row.getCell('status').font = { color: { argb: 'FF00B050' }, bold: true }; // Green
      } else {
        row.getCell('status').font = { color: { argb: 'FFFF0000' }, bold: true }; // Red
      }
    });

    // Add summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    // Style summary header
    const summaryHeader = summarySheet.getRow(1);
    summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };

    // Add summary data
    const totalExtracted = extractedFields.filter(f => f.raw_text).length;
    const summaryData = [
      { metric: 'Template Name', value: templateName },
      { metric: 'Total Pages', value: pageResults.length },
      { metric: 'Total Fields', value: extractedFields.length },
      { metric: 'Successfully Extracted', value: totalExtracted },
      { metric: 'Extraction Rate', value: `${Math.round((totalExtracted / extractedFields.length) * 100)}%` },
      { metric: 'Generated Date', value: new Date().toISOString() }
    ];

    summaryData.forEach((data, index) => {
      const row = summarySheet.addRow(data);
      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }
    });

    // Add page breakdown sheet if multiple pages
    if (pageResults.length > 1) {
      const pageBreakSheet = workbook.addWorksheet('Page Breakdown');
      pageBreakSheet.columns = [
        { header: 'Page Number', key: 'page', width: 15 },
        { header: 'Fields on Page', key: 'total_fields', width: 15 },
        { header: 'Extracted', key: 'extracted', width: 15 },
        { header: 'Success Rate', key: 'success_rate', width: 15 }
      ];

      const pageHeader = pageBreakSheet.getRow(1);
      pageHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      pageHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };

      pageResults.forEach((pageResult, index) => {
        const extracted = pageResult.fields.filter((f: any) => f.raw_text).length;
        const total = pageResult.fields.length;
        const rate = total > 0 ? Math.round((extracted / total) * 100) : 0;

        const row = pageBreakSheet.addRow({
          page: pageResult.pageNumber,
          total_fields: total,
          extracted: extracted,
          success_rate: `${rate}%`
        });

        if (index % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        }

        row.getCell('page').alignment = { horizontal: 'center' };
        row.getCell('total_fields').alignment = { horizontal: 'center' };
        row.getCell('extracted').alignment = { horizontal: 'center' };
        row.getCell('success_rate').alignment = { horizontal: 'center' };
      });
    }

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    logger.info(`✓ Excel file generated with ${extractedFields.length} fields`);

    return buffer as unknown as Buffer;
  } catch (error: any) {
    logger.error('Error generating Excel file:', error);
    throw new AppError(`Failed to generate Excel file: ${error.message}`, 500);
  }
}