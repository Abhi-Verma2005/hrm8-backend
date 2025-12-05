/**
 * Local Storage Service
 * Handles file uploads to local disk when Cloudinary is not configured
 */

import fs from 'fs';
import path from 'path';
import { UploadResult, UploadOptions } from './CloudinaryService';

export class LocalStorageService {
    // Use process.cwd() to ensure we are relative to the project root
    private static uploadDir = path.join(process.cwd(), 'uploads');

    /**
     * Ensure upload directory exists
     */
    private static ensureUploadDir(subfolder?: string) {
        const targetDir = subfolder
            ? path.join(this.uploadDir, subfolder)
            : this.uploadDir;

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        return targetDir;
    }

    /**
     * Upload a file buffer to local disk
     */
    static async uploadFile(
        buffer: Buffer,
        fileName: string,
        options: UploadOptions = {}
    ): Promise<UploadResult> {
        // Determine folder path
        const folder = options.folder || 'hrm8/misc';
        const targetDir = this.ensureUploadDir(folder);

        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(fileName);
        const basename = path.basename(fileName, ext);
        const uniqueFileName = `${basename}-${uniqueSuffix}${ext}`;
        const filePath = path.join(targetDir, uniqueFileName);

        // Write file
        await fs.promises.writeFile(filePath, buffer);

        // Construct public URL
        // Assuming server is running on localhost:3000
        // The path should be relative to the uploads root
        const relativePath = path.join(folder, uniqueFileName);
        const publicUrl = `/uploads/${relativePath}`; // Relative URL for frontend

        return {
            url: publicUrl,
            secureUrl: publicUrl, // For local, http is fine
            publicId: relativePath,
            format: ext.replace('.', ''),
            bytes: buffer.length
        };
    }

    /**
     * Delete a file from local disk
     */
    static async deleteFile(publicId: string): Promise<void> {
        const filePath = path.join(this.uploadDir, publicId);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    }
}
