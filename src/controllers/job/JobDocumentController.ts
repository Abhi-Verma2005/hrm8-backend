/**
 * Job Document Controller
 * Handles document upload and parsing for job descriptions
 */

import { Response, RequestHandler } from 'express';
import { AuthenticatedRequest } from '../../types';
import { DocumentParserService } from '../../services/document/DocumentParserService';
import { JobDescriptionExtractorService } from '../../services/ai/JobDescriptionExtractorService';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Check file extension as fallback
      const ext = file.originalname.toLowerCase().split('.').pop();
      if (['pdf', 'docx', 'doc', 'txt'].includes(ext || '')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, DOCX, DOC, and TXT are allowed.'));
      }
    }
  },
});

export class JobDocumentController {
  // Middleware for file upload
  static uploadMiddleware: RequestHandler = upload.single('document');

  /**
   * Parse and extract job details from uploaded document
   * POST /api/jobs/parse-document
   */
  static async parseDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      console.log(`📄 Parsing document: ${req.file.originalname}, type: ${req.file.mimetype}, size: ${req.file.size} bytes`);

      // Step 1: Parse document
      const parsed = await DocumentParserService.parseDocument(req.file);
      console.log(`✅ Document parsed: ${parsed.metadata?.wordCount || 0} words, ${parsed.metadata?.pages || 'N/A'} pages`);

      // Step 2: Extract job details with AI (falls back to pattern matching if AI unavailable)
      const extracted = await JobDescriptionExtractorService.extractWithOpenAI(parsed);
      console.log(`✅ Job data extracted: title="${extracted.title}", ${extracted.requirements.length} requirements, ${extracted.responsibilities.length} responsibilities`);

      res.json({
        success: true,
        data: {
          extractedText: parsed.text.substring(0, 1000), // Preview (first 1000 chars)
          fullText: parsed.text, // Full text for reference
          extractedData: extracted,
          metadata: parsed.metadata,
        },
      });
    } catch (error) {
      console.error('❌ Error parsing document:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse document',
      });
    }
  }
}

