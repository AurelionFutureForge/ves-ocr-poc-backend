import express, { Router } from 'express';
import multer from 'multer';
import { processOcrController, extractTemplateFieldsController } from '@/v1/controllers/ocr.controller';

const router: Router = express.Router();

// Configure multer for file upload
// Using memory storage to keep files in memory as buffers
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'application/pdf'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDF files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * @route POST /api/v1/ocr/upload
 * @desc Process OCR from uploaded file
 * @access Public
 * @body {file} image - Image file to process
 * @body {string} language - Optional language code (default: 'eng')
 */
router.post('/upload', upload.single('image'), processOcrController);

/**
 * @route POST /api/v1/ocr/extract-template-fields
 * @desc Extract template fields from multiple images (frontend splits PDF into pages)
 * Frontend responsibility: Split PDF → Convert each page to image → Send all images
 * Backend responsibility: Fetch template fields → Process each image → Generate ONE Excel
 * @access Public
 * @body {files} images - Multiple image files (JPG, PNG, WEBP, etc)
 *                       Frontend splits PDF pages and sends as individual images
 * @body {string} templateId - Template ID (required - used to fetch fields)
 * @body {string} language - Optional language code (default: 'eng')
 * @body {boolean} aggressive - Optional aggressive preprocessing (default: true)
 * 
 * @workflow
 * Frontend:
 *   1. Load PDF
 *   2. Split into pages
 *   3. Convert each page → PNG/JPG image
 *   4. Send all images to backend
 * 
 * Backend:
 *   1. Receive N images (one per page)
 *   2. Fetch template fields from database
 *   3. For each image → extract fields for that page_number
 *   4. Combine all results
 *   5. Generate ONE Excel sheet with all pages
 * 
 * Result: ONE Excel file with data from all pages
 */
router.post('/extract-template-fields', upload.array('images', 100), extractTemplateFieldsController);

export default router;