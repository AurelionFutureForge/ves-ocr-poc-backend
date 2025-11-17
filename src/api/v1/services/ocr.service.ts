import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import logger from '@/v1/utils/logger';
import { AppError } from '@/v1/middlewares/errorHandler.middleware';
import axios from 'axios';

// PDF support (optional - will be imported dynamically)
let pdfjsLib: any = null;
try {
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
} catch (e) {
  logger.warn('pdfjs-dist not installed. PDF support disabled. Run: npm install pdfjs-dist canvas');
}

interface OcrResponse {
  status: number;
  success: boolean;
  message: string;
  data?: any;
}

interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/* -------------------------------------------------------
   CONFIGURATION - OCR ENGINE SELECTION
---------------------------------------------------------*/
const OCR_ENGINE = process.env.OCR_ENGINE || 'tesseract'; // 'tesseract', 'ocrspace', 'google-vision'

/* -------------------------------------------------------
   PDF TO IMAGES CONVERSION
---------------------------------------------------------*/
export async function convertPDFToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  try {
    if (!pdfjsLib) {
      throw new Error('PDF support not installed. Run: npm install pdfjs-dist canvas');
    }

    logger.info('Converting PDF to images...');

    // Get the PDF document
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    const numPages = pdf.numPages;
    
    logger.info(`PDF has ${numPages} pages`);

    const images: Buffer[] = [];

    // Convert each page to image
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        
        // Get page viewport
        const viewport = page.getViewport({ scale: 2 }); // 2x scale for better quality
        
        // Create canvas-like object using node-canvas or similar
        // For Node.js, we'll use a different approach - render to PNG using pdfjsLib
        const canvas = await renderPageToCanvas(page, viewport);
        
        // Convert canvas to buffer
        const imageBuffer = await canvas.toBuffer('image/png');
        images.push(imageBuffer);
        
        logger.info(`✓ Page ${pageNum}/${numPages} converted to image`);
      } catch (pageError: any) {
        logger.error(`Error converting page ${pageNum}:`, pageError);
        throw new Error(`Failed to convert PDF page ${pageNum}: ${pageError.message}`);
      }
    }

    logger.info(`Successfully converted ${images.length} pages from PDF`);
    return images;
  } catch (error: any) {
    logger.error('PDF conversion error:', error);
    throw new AppError(`Failed to convert PDF to images: ${error.message}`, 400);
  }
}

/* -------------------------------------------------------
   RENDER PDF PAGE TO CANVAS (For Node.js)
---------------------------------------------------------*/
async function renderPageToCanvas(page: any, viewport: any): Promise<any> {
  try {
    // Use Canvas library for Node.js rendering
    const { createCanvas } = require('canvas');
    
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext('2d');

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    return canvas;
  } catch (error: any) {
    // Fallback: If canvas not available, return empty image
    logger.warn('Canvas rendering failed, using fallback:', error.message);
    throw error;
  }
}

/* -------------------------------------------------------
   ADVANCED IMAGE PREPROCESSING
---------------------------------------------------------*/
async function preprocessImage(imageBuffer: Buffer, aggressive: boolean = true): Promise<Buffer> {
  try {
    if (aggressive) {
      // Aggressive preprocessing for difficult images
      return await sharp(imageBuffer)
        .resize({
          width: 3000,
          fit: 'inside',
          withoutEnlargement: false
        })
        .grayscale()
        .normalize()
        .sharpen({ sigma: 2, m1: 1.5, m2: 2 })
        .linear(1.8, -(128 * 1.8) + 128) // Increase contrast
        .median(3) // Reduce noise
        .threshold(140) // Binarize
        .png({ compressionLevel: 0, quality: 100 })
        .toBuffer();
    } else {
      // Light preprocessing
      return await sharp(imageBuffer)
        .resize({
          width: 2500,
          fit: 'inside',
          withoutEnlargement: false
        })
        .normalize()
        .sharpen()
        .png({ compressionLevel: 0, quality: 100 })
        .toBuffer();
    }
  } catch (error: any) {
    throw new AppError(`Image preprocessing failed: ${error.message}`, 500);
  }
}

/* -------------------------------------------------------
   TESSERACT.JS - IMPROVED CONFIGURATION
---------------------------------------------------------*/
async function processWithTesseract(imageBuffer: Buffer, language: string = 'eng'): Promise<any> {
  try {
    logger.info('Starting Tesseract.js OCR with improved configuration...');

    const worker = await Tesseract.createWorker(language, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.info(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // Optimized parameters for better accuracy
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      preserve_interword_spaces: '1',
      tessedit_create_hocr: '1',
      tessedit_char_whitelist: '',
    });

    const result = await worker.recognize(imageBuffer);
    await worker.terminate();

    // Extract structured data from Tesseract result
    const data: any = result.data;
    let words: any[] = [];
    let lines: any[] = [];
    let paragraphs: any[] = [];
    let blocks: any[] = [];

    // Try to get data from HOCR first (most reliable)
    if (data.hocr) {
      try {
        const hocrData = parseHOCR(data.hocr);
        words = hocrData.words;
        lines = hocrData.lines;
        paragraphs = hocrData.paragraphs;
        blocks = hocrData.blocks;
        logger.info(`Extracted from HOCR: ${words.length} words, ${lines.length} lines`);
      } catch (hocrError: any) {
        logger.warn(`HOCR parsing failed: ${hocrError.message}`);
      }
    }

    // Fallback: Create synthetic words/lines from text if HOCR parsing didn't work
    if (words.length === 0 && data.text) {
      logger.info('Creating synthetic words from text (HOCR unavailable)');
      const textLines = data.text.split('\n').filter((line: string) => line.trim());
      
      let yOffset = 0;
      textLines.forEach((textLine: string) => {
        const wordTexts = textLine.split(/\s+/).filter((w: string) => w.trim());
        
        if (wordTexts.length > 0) {
          let xOffset = 0;
          
          wordTexts.forEach((wordText: string) => {
            // Estimate width based on character count (rough approximation)
            const estimatedWidth = wordText.length * 8; // ~8px per character
            
            words.push({
              text: wordText,
              confidence: Math.round(data.confidence || 0),
              bbox: {
                x0: xOffset,
                y0: yOffset,
                x1: xOffset + estimatedWidth,
                y1: yOffset + 20 // ~20px height per word
              }
            });
            
            xOffset += estimatedWidth + 5; // 5px spacing between words
          });
          
          // Create line from words
          lines.push({
            text: textLine,
            confidence: Math.round(data.confidence || 0),
            bbox: {
              x0: 0,
              y0: yOffset,
              x1: xOffset,
              y1: yOffset + 20
            }
          });
          
          yOffset += 25; // Move to next line
        }
      });
      
      // Group lines into paragraphs
      if (lines.length > 0) {
        const grouped = groupIntoStructures(lines);
        paragraphs = grouped.paragraphs;
        blocks = grouped.blocks;
      }
    }

    logger.info(`Tesseract extracted: ${words.length} words, ${lines.length} lines, ${paragraphs.length} paragraphs`);

    return {
      success: true,
      text: result.data.text || '',
      confidence: Math.round(result.data.confidence || 0),
      words: words,
      lines: lines,
      paragraphs: paragraphs,
      blocks: blocks
    };
  } catch (error: any) {
    throw new Error(`Tesseract processing failed: ${error.message}`);
  }
}

/* -------------------------------------------------------
   OCR.SPACE API (FREE TIER AVAILABLE)
---------------------------------------------------------*/
async function processWithOCRSpace(imageBuffer: Buffer, language: string = 'eng'): Promise<any> {
  try {
    const apiKey = process.env.OCRSPACE_API_KEY || 'helloworld'; // Free API key
    
    logger.info('Starting OCR.space API processing...');

    // Convert buffer to base64
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    const formData = {
      apikey: apiKey,
      base64Image: base64Image,
      language: language === 'eng' ? 'eng' : language,
      isOverlayRequired: true,
      detectOrientation: true,
      scale: true,
      OCREngine: 2, // Engine 2 is more accurate
    };

    const response = await axios.post('https://api.ocr.space/parse/image', formData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;

    if (!data.IsErroredOnProcessing && data.ParsedResults && data.ParsedResults.length > 0) {
      const result = data.ParsedResults[0];
      const text = result.ParsedText || '';
      
      // Parse TextOverlay for structure
      const words: any[] = [];
      const lines: any[] = [];
      const paragraphs: any[] = [];
      const blocks: any[] = [];

      if (result.TextOverlay && result.TextOverlay.Lines) {
        result.TextOverlay.Lines.forEach((line: any) => {
          const lineText = line.LineText || '';
          const lineBbox = {
            x: line.MinTop || 0,
            y: line.MaxHeight || 0,
            w: (line.MinTop || 0) + (line.MaxHeight || 0),
            h: line.MaxHeight || 0
          };

          lines.push({
            text: lineText,
            confidence: 90, // OCR.space doesn't provide confidence
            bbox: lineBbox
          });

          if (line.Words) {
            line.Words.forEach((word: any) => {
              words.push({
                text: word.WordText || '',
                confidence: 90,
                bbox: {
                  x: word.Left || 0,
                  y: word.Top || 0,
                  w: word.Width || 0,
                  h: word.Height || 0
                }
              });
            });
          }
        });
      }

      // Group lines into paragraphs
      if (lines.length > 0) {
        const grouped = groupIntoStructures(lines);
        paragraphs.push(...grouped.paragraphs);
        blocks.push(...grouped.blocks);
      }

      return {
        success: true,
        text: text,
        confidence: 90,
        words: words,
        lines: lines,
        paragraphs: paragraphs,
        blocks: blocks
      };
    } else {
      throw new Error(data.ErrorMessage || 'OCR.space processing failed');
    }
  } catch (error: any) {
    throw new Error(`OCR.space API failed: ${error.message}`);
  }
}

/* -------------------------------------------------------
   PARSE HOCR (HTML-based OCR format)
---------------------------------------------------------*/
function parseHOCR(hocr: string): any {
  const words: any[] = [];
  const lines: any[] = [];
  const paragraphs: any[] = [];
  const blocks: any[] = [];

  if (!hocr) {
    return { words, lines, paragraphs, blocks };
  }

  // Simple HOCR parsing (you can use a proper XML parser for production)
  const wordMatches = hocr.match(/class=['"]ocrx_word['"].*?title=['"]bbox (\d+) (\d+) (\d+) (\d+).*?>(.*?)<\/span>/g);
  
  if (wordMatches) {
    wordMatches.forEach((match) => {
      const bboxMatch = match.match(/bbox (\d+) (\d+) (\d+) (\d+)/);
      const textMatch = match.match(/>(.*?)<\/span>/);
      
      if (bboxMatch && textMatch && textMatch[1]) {
        const x0 = parseInt(bboxMatch[1]);
        const y0 = parseInt(bboxMatch[2]);
        const x1 = parseInt(bboxMatch[3]);
        const y1 = parseInt(bboxMatch[4]);
        const text = textMatch[1].replace(/<[^>]*>/g, '').trim();

        if (text) {
          words.push({
            text: text,
            confidence: 85,
            bbox: {
              x: x0,
              y: y0,
              w: x1 - x0,
              h: y1 - y0
            }
          });
        }
      }
    });
  }

  // Group words into lines, paragraphs, and blocks
  if (words.length > 0) {
    const grouped = groupIntoStructures(words);
    lines.push(...grouped.lines);
    paragraphs.push(...grouped.paragraphs);
    blocks.push(...grouped.blocks);
  }

  return { words, lines, paragraphs, blocks };
}

/* -------------------------------------------------------
   GROUP WORDS/LINES INTO STRUCTURES
---------------------------------------------------------*/
function groupIntoStructures(items: any[]): any {
  const lines: any[] = [];
  const paragraphs: any[] = [];
  const blocks: any[] = [];

  if (items.length === 0) {
    return { lines, paragraphs, blocks };
  }

  // Sort by Y coordinate
  const sorted = [...items].sort((a, b) => a.bbox.y - b.bbox.y);

  // Group into lines (close Y coordinates)
  let currentLine = [sorted[0]];
  const lineThreshold = 15;

  for (let i = 1; i < sorted.length; i++) {
    const prevY = sorted[i - 1].bbox.y;
    const currY = sorted[i].bbox.y;

    if (Math.abs(currY - prevY) < lineThreshold) {
      currentLine.push(sorted[i]);
    } else {
      // Save current line
      if (currentLine.length > 0) {
        const lineTexts = currentLine.map(w => w.text);
        const lineConfidences = currentLine.map(w => w.confidence);
        const minX = Math.min(...currentLine.map(w => w.bbox.x));
        const minY = Math.min(...currentLine.map(w => w.bbox.y));
        const maxX = Math.max(...currentLine.map(w => w.bbox.x + w.bbox.w));
        const maxY = Math.max(...currentLine.map(w => w.bbox.y + w.bbox.h));

        lines.push({
          text: lineTexts.join(' '),
          confidence: Math.round(lineConfidences.reduce((a, b) => a + b, 0) / lineConfidences.length),
          bbox: {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY
          }
        });
      }
      currentLine = [sorted[i]];
    }
  }

  // Add last line
  if (currentLine.length > 0) {
    const lineTexts = currentLine.map(w => w.text);
    const lineConfidences = currentLine.map(w => w.confidence);
    const minX = Math.min(...currentLine.map(w => w.bbox.x));
    const minY = Math.min(...currentLine.map(w => w.bbox.y));
    const maxX = Math.max(...currentLine.map(w => w.bbox.x + w.bbox.w));
    const maxY = Math.max(...currentLine.map(w => w.bbox.y + w.bbox.h));

    lines.push({
      text: lineTexts.join(' '),
      confidence: Math.round(lineConfidences.reduce((a, b) => a + b, 0) / lineConfidences.length),
      bbox: {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY
      }
    });
  }

  // Group lines into paragraphs
  if (lines.length > 0) {
    let currentPara = [lines[0]];
    const paraThreshold = 40;

    for (let i = 1; i < lines.length; i++) {
      const prevY = lines[i - 1].bbox.y + lines[i - 1].bbox.h;
      const currY = lines[i].bbox.y;

      if (Math.abs(currY - prevY) < paraThreshold) {
        currentPara.push(lines[i]);
      } else {
        // Save current paragraph
        if (currentPara.length > 0) {
          const paraTexts = currentPara.map(l => l.text);
          const paraConfidences = currentPara.map(l => l.confidence);
          const minX = Math.min(...currentPara.map(l => l.bbox.x));
          const minY = Math.min(...currentPara.map(l => l.bbox.y));
          const maxX = Math.max(...currentPara.map(l => l.bbox.x + l.bbox.w));
          const maxY = Math.max(...currentPara.map(l => l.bbox.y + l.bbox.h));

          paragraphs.push({
            text: paraTexts.join(' '),
            confidence: Math.round(paraConfidences.reduce((a, b) => a + b, 0) / paraConfidences.length),
            bbox: {
              x: minX,
              y: minY,
              w: maxX - minX,
              h: maxY - minY
            }
          });
        }
        currentPara = [lines[i]];
      }
    }

    // Add last paragraph
    if (currentPara.length > 0) {
      const paraTexts = currentPara.map(l => l.text);
      const paraConfidences = currentPara.map(l => l.confidence);
      const minX = Math.min(...currentPara.map(l => l.bbox.x));
      const minY = Math.min(...currentPara.map(l => l.bbox.y));
      const maxX = Math.max(...currentPara.map(l => l.bbox.x + l.bbox.w));
      const maxY = Math.max(...currentPara.map(l => l.bbox.y + l.bbox.h));

      paragraphs.push({
        text: paraTexts.join(' '),
        confidence: Math.round(paraConfidences.reduce((a, b) => a + b, 0) / paraConfidences.length),
        bbox: {
          x: minX,
          y: minY,
          w: maxX - minX,
          h: maxY - minY
        }
      });
    }
  }

  // Blocks are just paragraphs for our purposes
  blocks.push(...paragraphs);

  return { lines, paragraphs, blocks };
}

/* -------------------------------------------------------
   OCR PROCESSING (FILE) - MULTI-ENGINE
---------------------------------------------------------*/
export async function processOcr(
  file: Express.Multer.File,
  language: string = 'eng',
  preprocess: boolean = true
): Promise<OcrResponse> {
  try {
    if (!file) throw new AppError('No file uploaded', 400);

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError('Invalid file type', 400);
    }

    let imageBuffer = file.buffer;

    // Preprocess image
    if (preprocess) {
      logger.info('Preprocessing image for better OCR accuracy...');
      imageBuffer = await preprocessImage(imageBuffer, true);
    }

    let result: any;

    // Select OCR engine
    if (OCR_ENGINE === 'ocrspace') {
      result = await processWithOCRSpace(imageBuffer, language);
    } else {
      // Default to Tesseract
      result = await processWithTesseract(imageBuffer, language);
    }

    logger.info(`OCR completed. Engine: ${OCR_ENGINE}, Confidence: ${result.confidence}%, Words: ${result.words?.length || 0}`);

    return {
      status: 200,
      success: true,
      message: 'OCR processing completed successfully',
      data: {
        text: result.text || '',
        confidence: result.confidence || 0,
        words: result.words || [],
        lines: result.lines || [],
        paragraphs: result.paragraphs || [],
        blocks: result.blocks || [],
        engine: OCR_ENGINE
      }
    };

  } catch (error: any) {
    logger.error('OCR Error:', error);
    throw new AppError(`OCR processing failed: ${error.message}`, 500);
  }
}

/* -------------------------------------------------------
   OCR PROCESSING (URL) - MULTI-ENGINE
---------------------------------------------------------*/
export async function processOcrFromUrl(
  imageUrl: string,
  language: string = 'eng',
  preprocess: boolean = true
): Promise<OcrResponse> {
  try {
    new URL(imageUrl);

    logger.info(`Downloading image from URL: ${imageUrl}`);
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    let imageBuffer = Buffer.from(response.data);

    if (preprocess) {
      logger.info('Preprocessing image for better OCR accuracy...');
      imageBuffer = await preprocessImage(imageBuffer, true);
    }

    let result: any;

    // Select OCR engine
    if (OCR_ENGINE === 'ocrspace') {
      result = await processWithOCRSpace(imageBuffer, language);
    } else {
      // Default to Tesseract
      result = await processWithTesseract(imageBuffer, language);
    }

    logger.info(`OCR completed. Engine: ${OCR_ENGINE}, Confidence: ${result.confidence}%, Words: ${result.words?.length || 0}`);

    return {
      status: 200,
      success: true,
      message: 'OCR processing completed successfully',
      data: {
        text: result.text || '',
        confidence: result.confidence || 0,
        words: result.words || [],
        lines: result.lines || [],
        paragraphs: result.paragraphs || [],
        blocks: result.blocks || [],
        engine: OCR_ENGINE
      }
    };

  } catch (error: any) {
    logger.error('OCR Error:', error);
    throw new AppError(`OCR processing failed: ${error.message}`, 500);
  }
}

/* -------------------------------------------------------
   EXTRACT TEXT FROM REGION - FOR TEMPLATE FIELDS
---------------------------------------------------------*/
export async function extractTextFromRegion(
   imageBuffer: Buffer,
   region: {
     x_norm: number;
     y_norm: number;
     w_norm: number;
     h_norm: number;
     page_number?: number;
   },
   aggressive: boolean = false,
   language: string = 'eng'
 ): Promise<{ text: string; confidence: number; notes: string | null }> {
   try {
     // Get image metadata to convert normalized coords to pixels
     const metadata = await sharp(imageBuffer).metadata();
     const imageWidth = metadata.width || 1000;
     const imageHeight = metadata.height || 1000;
 
     // Convert normalized coordinates to pixels
     const x = Math.round(region.x_norm * imageWidth);
     const y = Math.round(region.y_norm * imageHeight);
     const w = Math.round(region.w_norm * imageWidth);
     const h = Math.round(region.h_norm * imageHeight);
 
     logger.info(`Extracting region: x=${x}, y=${y}, w=${w}, h=${h} from ${imageWidth}x${imageHeight}`);
 
     // Extract the region from the image
     let regionBuffer = await sharp(imageBuffer)
       .extract({
         left: Math.max(0, x),
         top: Math.max(0, y),
         width: Math.min(w, imageWidth - x),
         height: Math.min(h, imageHeight - y),
       })
       .toBuffer();
 
     // Preprocess the extracted region
     regionBuffer = await preprocessImage(regionBuffer, aggressive);
 
     // Run OCR on the region
     const result = await processWithTesseract(regionBuffer, language);
 
     const text = (result.text || '').trim();
     const confidence = result.confidence || 0;
 
     // Determine if text was found
     let notes: string | null = null;
     if (text.length === 0) {
       notes = 'No text detected in marked region';
     } else if (confidence < 50) {
       notes = 'Low confidence - text may be unclear or partially obscured';
     }
 
     logger.info(`Region extraction: text="${text.substring(0, 50)}", confidence=${confidence}%`);
 
     return {
       text,
       confidence,
       notes,
     };
   } catch (error: any) {
     logger.error('Error extracting region:', error);
     throw new AppError(`Failed to extract text from region: ${error.message}`, 500);
   }
}

/* -------------------------------------------------------
   EXTRACT TEMPLATE FIELDS FROM IMAGE
---------------------------------------------------------*/
export async function extractTemplateFields(
  imageBuffer: Buffer,
  pageNumber: number,
  templateFields: Array<{
    field_id: string;
    field_name: string;
    page_number: number;
    x_norm: number;
    y_norm: number;
    w_norm: number;
    h_norm: number;
  }>,
  language: string = 'eng',
  aggressive: boolean = true
): Promise<Array<{
  field_id: string;
  field_name: string;
  raw_text: string | null;
  confidence: number;
  notes: string | null;
}>> {
  try {
    // Filter fields for this page
    const fieldsOnPage = templateFields.filter(f => f.page_number === pageNumber);
    
    logger.info(`Extracting ${fieldsOnPage.length} fields from page ${pageNumber}`);

    const results: Array<{
      field_id: string;
      field_name: string;
      raw_text: string | null;
      confidence: number;
      notes: string | null;
    }> = [];

    // Extract each field
    for (const field of fieldsOnPage) {
      try {
        const extraction = await extractTextFromRegion(
          imageBuffer,
          {
            x_norm: field.x_norm,
            y_norm: field.y_norm,
            w_norm: field.w_norm,
            h_norm: field.h_norm,
            page_number: pageNumber
          },
          aggressive,
          language
        );

        results.push({
          field_id: field.field_id,
          field_name: field.field_name,
          raw_text: extraction.text || null,
          confidence: extraction.confidence,
          notes: extraction.notes
        });

        logger.info(`Field "${field.field_name}": "${extraction.text?.substring(0, 30)}..." (${extraction.confidence}%)`);
      } catch (fieldError: any) {
        logger.error(`Error extracting field "${field.field_name}":`, fieldError);
        results.push({
          field_id: field.field_id,
          field_name: field.field_name,
          raw_text: null,
          confidence: 0,
          notes: `Error: ${fieldError.message}`
        });
      }
    }

    return results;
  } catch (error: any) {
    logger.error('Error extracting template fields:', error);
    throw new AppError(`Failed to extract template fields: ${error.message}`, 500);
  }
}
