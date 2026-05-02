import { Client } from 'ssh2';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const config = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
};

async function checkBlogs() {
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
      if (err) throw err;
      
      const path = 'infano-dev/uploads/blogs';
      sftp.readdir(path, (err, list) => {
        if (err) {
          console.error(`Error reading ${path}:`, err.message);
        } else {
          console.log(`${path} exists!`);
        }
        conn.end();
      });
    });
  }).connect(config);
}

checkBlogs();
