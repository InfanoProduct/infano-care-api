import { Client } from 'ssh2';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../config/logger.js';
import { ImageProcessor } from './imageProcessor.js';

export class RemoteStorageService {
  /**
   * Uploads a file to the remote server via SFTP
   * @param localPath Path to the local file
   * @param folder Subfolder on the remote server
   * @returns The remote filename and public URL
   */
  static async uploadFile(localPath: string, folder: string = ''): Promise<{ filename: string; url: string }> {
    const { SSH_HOST, SSH_USER, SSH_PASSWORD, SSH_UPLOAD_PATH, IMAGE_BASE_URL } = process.env;

    if (!SSH_HOST || !SSH_USER || !SSH_PASSWORD) {
      throw new Error('SSH credentials not configured');
    }

    // 1. Optimize locally first
    await ImageProcessor.optimize(localPath);

    const ext = path.extname(localPath);
    const filename = `${path.basename(localPath, ext)}-${uuidv4()}${ext}`;
    const remoteDir = path.join(SSH_UPLOAD_PATH || '/root/infano-dev/uploads', folder).replace(/\\/g, '/');
    const remotePath = path.join(remoteDir, filename).replace(/\\/g, '/');

    return new Promise((resolve, reject) => {
      const conn = new Client();
      
      conn.on('ready', () => {
        conn.sftp(async (err, sftp) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          try {
            // Ensure remote directory exists
            await this.ensureRemoteDir(sftp, remoteDir);

            // Upload file
            sftp.fastPut(localPath, remotePath, (uploadErr) => {
              if (uploadErr) {
                conn.end();
                return reject(uploadErr);
              }

              conn.end();
              
              const baseUrl = IMAGE_BASE_URL || `https://${SSH_HOST}/uploads`;
              const url = `${baseUrl}/${folder ? folder + '/' : ''}${filename}`;
              
              logger.info({ remotePath, url }, 'File uploaded to remote storage');
              
              // Optional: Cleanup local file after upload
              fs.unlink(localPath).catch(e => logger.warn({ error: e }, 'Failed to cleanup local file'));
              
              resolve({ filename, url });
            });
          } catch (dirErr) {
            conn.end();
            reject(dirErr);
          }
        });
      }).on('error', (err) => {
        reject(err);
      }).connect({
        host: SSH_HOST,
        port: 22,
        username: SSH_USER,
        password: SSH_PASSWORD,
      });
    });
  }

  private static async ensureRemoteDir(sftp: any, remoteDir: string): Promise<void> {
    const parts = remoteDir.split('/').filter(Boolean);
    let currentPath = remoteDir.startsWith('/') ? '/' : '';

    for (const part of parts) {
      currentPath = path.join(currentPath, part).replace(/\\/g, '/');
      try {
        await new Promise((resolve, reject) => {
          sftp.mkdir(currentPath, (err: any) => {
            if (err && err.code !== 4) { // 4 is "already exists" in some SFTP implementations
              // Check if it exists anyway
              sftp.stat(currentPath, (statErr: any) => {
                if (statErr) return reject(err);
                resolve(true);
              });
            } else {
              resolve(true);
            }
          });
        });
      } catch (e) {
        // Ignore if directory exists
      }
    }
  }
}
