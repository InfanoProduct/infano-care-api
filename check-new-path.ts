import { Client } from 'ssh2';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const config = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
};

const newPath = 'docker/infano-dev/uploads/blogs';

async function checkPath() {
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
      if (err) throw err;
      
      sftp.readdir(newPath, (err, list) => {
        if (err) {
          console.error(`Error reading path ${newPath}:`, err.message);
          // Try absolute path if relative failed
          const absolutePath = '/root/' + newPath;
          console.log(`Trying absolute path: ${absolutePath}`);
          sftp.readdir(absolutePath, (err2, list2) => {
            if (err2) {
              console.error(`Error reading absolute path ${absolutePath}:`, err2.message);
            } else {
              console.log(`Success! Found directory at ${absolutePath}`);
              console.log(`Files found: ${list2.length}`);
            }
            conn.end();
          });
        } else {
          console.log(`Success! Found directory at relative path ${newPath}`);
          console.log(`Files found: ${list.length}`);
          conn.end();
        }
      });
    });
  }).connect(config);
}

checkPath();
