/**
 * Candidate Resume Controller
 * Handles resume upload and parsing
 */

import { Response } from 'express';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';
import { DocumentParserService } from '../../services/document/DocumentParserService';
import { ResumeParserService } from '../../services/ai/ResumeParserService';
import { CloudinaryService } from '../../services/storage/CloudinaryService';
import { CandidateModel } from '../../models/Candidate';

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

            // Step 1: Upload to Cloudinary (if configured)
            let resumeUrl: string | undefined;
            if (CloudinaryService.isConfigured() && req.candidate) {
                try {
                    console.log('Uploading resume to Cloudinary...');
                    const uploadResult = await CloudinaryService.uploadMulterFile(file, {
                        folder: `hrm8/candidates/${req.candidate.id}/resumes`,
                        resourceType: 'raw'
                    });
                    resumeUrl = uploadResult.secureUrl;
                    console.log(`Resume uploaded to: ${resumeUrl}`);

                    // Update candidate profile with resume URL
                    await CandidateModel.update(req.candidate.id, {
                        resumeUrl: resumeUrl
                    });
                } catch (uploadError) {
                    console.error('Failed to upload resume to Cloudinary:', uploadError);
                    // Continue with parsing even if upload fails
                }
            }

            // Step 2: Extract structured data using AI
            const extractedData = await ResumeParserService.parseResume(parsedDocument);

            console.log(`Successfully parsed resume: ${extractedData.workExperience.length} experiences, ${extractedData.skills.length} skills, ${extractedData.education.length} education, ${extractedData.certifications.length} certifications, ${extractedData.training.length} training`);

            res.json({
                success: true,
                data: {
                    ...extractedData,
                    resumeUrl
                },
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
