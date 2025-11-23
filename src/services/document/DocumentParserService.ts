/**
 * Document Parser Service
 * Handles parsing of PDF, DOCX, and TXT files
 */

const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

export interface ParsedDocument {
  text: string;
  metadata?: {
    title?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
  };
}

export class DocumentParserService {
  /**
   * Parse PDF document
   */
  static async parsePDF(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const data = await pdfParse(buffer);
      return {
        text: data.text,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          pages: data.numpages,
          wordCount: data.text.split(/\s+/).length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse DOCX document
   */
  static async parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      return {
        text,
        metadata: {
          wordCount: text.split(/\s+/).length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse TXT document
   */
  static async parseTXT(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const text = buffer.toString('utf-8');
      return {
        text,
        metadata: {
          wordCount: text.split(/\s+/).length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse TXT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse document based on MIME type
   */
  static async parseDocument(file: Express.Multer.File): Promise<ParsedDocument> {
    const mimeType = file.mimetype;
    const buffer = file.buffer;

    if (!buffer || buffer.length === 0) {
      throw new Error('File buffer is empty');
    }

    if (mimeType === 'application/pdf') {
      return this.parsePDF(buffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return this.parseDOCX(buffer);
    } else if (mimeType === 'text/plain') {
      return this.parseTXT(buffer);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}. Supported types: PDF, DOCX, DOC, TXT`);
    }
  }
}

