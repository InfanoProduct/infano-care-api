import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../config/logger.js';
import { ImageProcessor } from './imageProcessor.js';

export class StorageService {
  /**
   * Uploads a file to the local storage directory
   * @param localPath Path to the temporary local file
   * @param folder Subfolder in the uploads directory
   * @returns The filename and public URL
   */
  static async uploadFile(localPath: string, folder: string = ''): Promise<{ filename: string; url: string }> {
    const UPLOAD_PATH = process.env.UPLOAD_PATH || process.env.SSH_UPLOAD_PATH || 'uploads';
    const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || 'http://localhost:4005/uploads';

    // 1. Optimize locally first
    await ImageProcessor.optimize(localPath);

    const ext = path.extname(localPath);
    // Use existing filename if it has a UUID, otherwise add one
    const baseName = path.basename(localPath, ext);
    const filename = baseName.includes('-') ? `${baseName}${ext}` : `${baseName}-${uuidv4()}${ext}`;
    
    // Cross-platform path handling
    let baseDir: string;
    if (path.isAbsolute(UPLOAD_PATH)) {
      baseDir = UPLOAD_PATH;
      // If we are on Windows but the path is Linux-style (starts with /), fallback to local uploads
      if (process.platform === 'win32' && UPLOAD_PATH.startsWith('/')) {
        baseDir = path.join(process.cwd(), 'uploads');
      }
    } else {
      baseDir = path.join(process.cwd(), UPLOAD_PATH);
    }

    const targetDir = path.join(baseDir, folder);
    const targetPath = path.resolve(path.join(targetDir, filename));
    const sourcePath = path.resolve(localPath);

    try {
      // Ensure target directory exists
      await fs.mkdir(targetDir, { recursive: true });

      // Move file only if destination is different
      if (sourcePath !== targetPath) {
        await fs.copyFile(localPath, targetPath);
        await fs.unlink(localPath);
      }

      // Ensure baseUrl doesn't end with a slash for consistent joining
      const baseUrl = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL.slice(0, -1) : IMAGE_BASE_URL;
      const url = `${baseUrl}/${folder ? folder + '/' : ''}${filename}`.replace(/([^:]\/)\/+/g, "$1");
      
      logger.info({ targetPath, url }, 'File storage completed');
      
      return { filename, url };
    } catch (error) {
      logger.error({ error, localPath, targetPath }, 'Failed to upload file to local storage');
      throw error;
    }
  }
}
