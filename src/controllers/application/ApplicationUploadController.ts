/**
 * Application Upload Controller
 * Handles file uploads for job applications (resume, cover letter, portfolio)
 */

import { Response } from 'express';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';
import { CloudinaryService } from '../../services/storage/CloudinaryService';
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
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip', // For portfolio files
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Check file extension as fallback
      const ext = file.originalname.toLowerCase().split('.').pop();
      if (['pdf', 'doc', 'docx', 'txt', 'zip'].includes(ext || '')) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, ZIP`));
      }
    }
  },
});

export class ApplicationUploadController {
  // Middleware for single file upload
  static uploadMiddleware = upload.single('file');

  /**
   * Upload a file for application (resume, cover letter, or portfolio)
   * POST /api/applications/upload
   */
  static async uploadFile(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
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

      // Check if Cloudinary is configured
      if (!CloudinaryService.isConfigured()) {
        res.status(500).json({
          success: false,
          error: 'File upload service is not configured. Please contact support.',
        });
        return;
      }

      const fileType = req.body.type || 'resume'; // resume, coverLetter, portfolio
      const folder = `hrm8/applications/${candidate.id}/${fileType}`;

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadMulterFile(req.file, {
        folder,
        resourceType: 'raw', // All application documents are raw files
      });

      res.json({
        success: true,
        data: {
          url: result.secureUrl,
          publicId: result.publicId,
          fileName: req.file.originalname,
          fileSize: result.bytes,
          fileType,
        },
      });
    } catch (error) {
      console.error('[ApplicationUploadController.uploadFile] error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      });
    }
  }

  /**
   * Delete an uploaded file
   * DELETE /api/applications/upload/:publicId
   */
  static async deleteFile(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { publicId } = req.params;

      if (!publicId) {
        res.status(400).json({
          success: false,
          error: 'Missing publicId parameter',
        });
        return;
      }

      // Verify the file belongs to this candidate (check if publicId contains candidate ID)
      if (!publicId.includes(candidate.id)) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to delete this file',
        });
        return;
      }

      await CloudinaryService.deleteFile(publicId, 'raw');

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      console.error('[ApplicationUploadController.deleteFile] error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file',
      });
    }
  }
}


