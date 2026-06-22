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
    const UPLOAD_PATH = process.env.UPLOAD_PATH || 'uploads';
    const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || 'http://localhost:4005/uploads';
    const REMOTE_UPLOAD_API = process.env.REMOTE_UPLOAD_API; // e.g. http://109.199.120.104:4005/api/admin/upload

    // 1. Optimize locally first
    await ImageProcessor.optimize(localPath);

    // 2. If a remote upload API is configured, proxy the upload there
    // This allows local dev to upload directly to the production/dev server without SSH
    if (REMOTE_UPLOAD_API && !process.env.IS_SERVER) {
      try {
        const formData = new FormData();
        const fileBuffer = await fs.readFile(localPath);
        const fileName = path.basename(localPath);
        
        // Use a Blob/File-like object for the fetch request
        const file = new Blob([fileBuffer]);
        formData.append('file', file, fileName);

        logger.info({ REMOTE_UPLOAD_API }, 'Proxying file upload to remote server');

        const response = await fetch(`${REMOTE_UPLOAD_API}?folder=${folder}`, {
          method: 'POST',
          body: formData,
          // Note: FormData handles Content-Type and Boundary automatically
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Remote upload failed: ${response.status} ${errorText}`);
        }

        const data: any = await response.json();
        
        // Cleanup local temp file
        await fs.unlink(localPath).catch(() => {});
        
        return { 
          filename: data.filename, 
          url: data.url 
        };
      } catch (proxyError) {
        logger.error({ proxyError }, 'Proxy upload failed, falling back to local storage');
        // If proxy fails, we fall back to local storage
      }
    }

    const ext = path.extname(localPath);
    const baseName = path.basename(localPath, ext);
    let filename = path.basename(localPath);
    if (folder !== 'assets') {
      // Use existing filename if it has a UUID, otherwise add one
      filename = baseName.includes('-') ? `${baseName}${ext}` : `${baseName}-${uuidv4()}${ext}`;
    }
    
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

  /**
   * Safely lists all files within a subfolder under the uploads directory.
   */
  static async listAssets(folder: string = 'assets'): Promise<Array<{ filename: string; url: string; size: number; createdAt: Date }>> {
    const UPLOAD_PATH = process.env.UPLOAD_PATH || 'uploads';
    const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || 'http://localhost:4005/uploads';

    let baseDir: string;
    if (path.isAbsolute(UPLOAD_PATH)) {
      baseDir = UPLOAD_PATH;
      if (process.platform === 'win32' && UPLOAD_PATH.startsWith('/')) {
        baseDir = path.join(process.cwd(), 'uploads');
      }
    } else {
      baseDir = path.join(process.cwd(), UPLOAD_PATH);
    }

    const targetDir = path.join(baseDir, folder);
    
    try {
      // Ensure target directory exists
      await fs.mkdir(targetDir, { recursive: true });
      
      const files = await fs.readdir(targetDir);
      const list = [];
      
      for (const filename of files) {
        if (filename.startsWith('.')) continue;
        
        const filePath = path.join(targetDir, filename);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          const baseUrl = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL.slice(0, -1) : IMAGE_BASE_URL;
          const url = `${baseUrl}/${folder ? folder + '/' : ''}${filename}`.replace(/([^:]\/)\/+/g, "$1");
          
          list.push({
            filename,
            url,
            size: stats.size,
            createdAt: stats.mtime
          });
        }
      }
      
      return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      logger.error({ error, folder }, 'Failed to list files in local storage');
      throw error;
    }
  }

  /**
   * Safely deletes an asset from a subfolder under the uploads directory.
   */
  static async deleteAsset(filename: string, folder: string = 'assets'): Promise<void> {
    const UPLOAD_PATH = process.env.UPLOAD_PATH || 'uploads';

    let baseDir: string;
    if (path.isAbsolute(UPLOAD_PATH)) {
      baseDir = UPLOAD_PATH;
      if (process.platform === 'win32' && UPLOAD_PATH.startsWith('/')) {
        baseDir = path.join(process.cwd(), 'uploads');
      }
    } else {
      baseDir = path.join(process.cwd(), UPLOAD_PATH);
    }

    const filePath = path.join(baseDir, folder, filename);
    
    try {
      await fs.unlink(filePath);
      logger.info({ filePath }, 'File deleted from local storage');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error({ error, filePath }, 'Failed to delete file from local storage');
        throw error;
      }
    }
  }
}
