import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../config/logger.js';

export class ImageProcessor {
  /**
   * Optimizes an image at the given path
   * @param filePath Path to the image file
   * @param options Optimization options
   */
  static async optimize(filePath: string, options: { maxWidth?: number; quality?: number } = {}) {
    const { maxWidth = 1200, quality = 80 } = options;
    const ext = path.extname(filePath).toLowerCase();
    
    // Only process images
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return;
    }

    const tempPath = `${filePath}.tmp`;

    try {
      let pipeline = sharp(filePath);
      
      // Resize if too large
      const metadata = await pipeline.metadata();
      if (metadata.width && metadata.width > maxWidth) {
        pipeline = pipeline.resize(maxWidth);
      }

      // Compress based on format
      if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({ quality, progressive: true });
      } else if (ext === '.png') {
        pipeline = pipeline.png({ quality, compressionLevel: 9 });
      } else if (ext === '.webp') {
        pipeline = pipeline.webp({ quality });
      }

      await pipeline.toFile(tempPath);
      
      // Replace original with optimized
      await fs.unlink(filePath);
      await fs.rename(tempPath, filePath);
      
      logger.info({ filePath }, 'Image optimized successfully');
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to optimize image');
      // If failed, try to cleanup temp file if it exists
      try {
        await fs.access(tempPath);
        await fs.unlink(tempPath);
      } catch (e) {
        // Ignore
      }
    }
  }
}
