import { Client } from 'ssh2';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export const uploadToSftp = async (buffer: Buffer, originalName: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    const host = process.env.SSH_HOST;
    const port = parseInt(process.env.SSH_PORT || '22');
    const username = process.env.SSH_USER;
    const password = process.env.SSH_PASSWORD;
    const uploadPath = process.env.SSH_UPLOAD_PATH || '/root/infano-dev/uploads/blog';
    const baseUrl = process.env.IMAGE_BASE_URL || 'https://infano-prod.duckdns.org/uploads/blog';

    if (!host || !username || !password) {
      return reject(new Error('SSH credentials not configured'));
    }

    conn.on('ready', () => {
      conn.sftp((err: Error | undefined, sftp: any) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        // Generate a unique filename
        const ext = path.extname(originalName) || '.jpg';
        const filename = `${uuidv4()}${ext}`;
        const remotePath = path.posix.join(uploadPath, filename);

        // Recursive mkdir function for SFTP
        const ensureDir = (dir: string): Promise<void> => {
          return new Promise((resDir, rejDir) => {
            sftp.stat(dir, (err: any, stats: any) => {
              if (!err) {
                if (stats.isDirectory()) return resDir();
                else return rejDir(new Error(`${dir} exists but is not a directory`));
              }

              // Directory doesn't exist, try parent
              const parent = path.posix.dirname(dir);
              if (parent === dir || parent === '.' || parent === '/') {
                sftp.mkdir(dir, (err2: any) => {
                  if (!err2) resDir();
                  else rejDir(err2);
                });
                return;
              }

              ensureDir(parent)
                .then(() => {
                  sftp.mkdir(dir, (err2: any) => {
                    // Ignore error if it means directory already exists
                    if (!err2 || (err2 as any).code === 4) resDir();
                    else rejDir(err2);
                  });
                })
                .catch(rejDir);
            });
          });
        };

        // Ensure the directory exists then write the file
        ensureDir(uploadPath)
          .then(() => {
            const writeStream = sftp.createWriteStream(remotePath);
            
            writeStream.on('close', () => {
              conn.end();
              // Resolve with only the filename; client will construct full URL
              resolve(filename);
            });

            writeStream.on('error', (err: Error) => {
              conn.end();
              reject(err);
            });

            writeStream.end(buffer);
          })
          .catch((err: Error) => {
            conn.end();
            reject(err);
          });
      });
    }).on('error', (err: Error) => {
      reject(err);
    }).connect({
      host,
      port,
      username,
      password,
    });
  });
};
