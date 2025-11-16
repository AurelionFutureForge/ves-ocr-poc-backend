import express, { Router } from 'express';
import multer from 'multer';
import { processOcrController } from '@/v1/controllers/ocr.controller';

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

export default router;

