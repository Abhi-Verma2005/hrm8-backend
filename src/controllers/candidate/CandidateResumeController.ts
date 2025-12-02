/**
 * Candidate Resume Controller
 * Handles resume upload and parsing
 */

import { Response } from 'express';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';
import { DocumentParserService } from '../../services/document/DocumentParserService';
import { ResumeParserService } from '../../services/ai/ResumeParserService';

export class CandidateResumeController {
    /**
     * Parse resume
     * POST /api/candidate/resume/parse
     */
    static async parseResume(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const file = req.file;

            if (!file) {
                console.error('Resume upload failed: No file provided');
                res.status(400).json({
                    success: false,
                    error: 'No file uploaded. Please select a PDF, DOC, or DOCX file.',
                });
                return;
            }

            console.log(`Parsing resume: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);

            // Parse document text
            const parsedDocument = await DocumentParserService.parseDocument(file);

            if (!parsedDocument || !parsedDocument.text || parsedDocument.text.trim().length === 0) {
                console.error('Document parsing failed: No text extracted');
                res.status(400).json({
                    success: false,
                    error: 'Could not extract text from the document. Please ensure the file is not corrupted or password-protected.',
                });
                return;
            }

            console.log(`Extracted ${parsedDocument.text.length} characters from document`);

            // Extract structured data using AI
            const extractedData = await ResumeParserService.parseResume(parsedDocument);

            console.log(`Successfully parsed resume: ${extractedData.workExperience.length} experiences, ${extractedData.skills.length} skills`);

            res.json({
                success: true,
                data: extractedData,
            });
        } catch (error) {
            console.error('Resume parsing error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to parse resume. Please try again.',
            });
        }
    }
}
