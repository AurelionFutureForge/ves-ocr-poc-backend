import { z } from 'zod';

// Validation schema for OCR URL processing
export const OcrUrlSchema = z.object({
  body: z.object({
    imageUrl: z.string().url({ message: 'Invalid image URL' }),
    language: z.string().optional().default('eng')
  })
});

// Validation schema for OCR file upload
export const OcrUploadSchema = z.object({
  body: z.object({
    language: z.string().optional().default('eng')
  })
});

// Supported languages type
export const SupportedLanguages = z.enum([
  'eng', // English
  'spa', // Spanish
  'fra', // French
  'deu', // German
  'ita', // Italian
  'por', // Portuguese
  'rus', // Russian
  'ara', // Arabic
  'chi_sim', // Chinese Simplified
  'chi_tra', // Chinese Traditional
  'jpn', // Japanese
  'kor', // Korean
  'hin', // Hindi
  // Add more languages as needed
]);

export type SupportedLanguagesType = z.infer<typeof SupportedLanguages>;

