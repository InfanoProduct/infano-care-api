import { Client } from 'ssh2';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const config = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
};

async function compareDirs() {
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
      if (err) throw err;
      
      const path1 = 'infano-dev/uploads/blog';
      const path2 = '/data/docker/infano-dev/uploads/blogs';
      
      sftp.readdir(path1, (err1, list1) => {
        console.log(`Contents of ${path1}:`, err1 ? err1.message : list1.length + ' files');
        sftp.readdir(path2, (err2, list2) => {
          console.log(`Contents of ${path2}:`, err2 ? err2.message : list2.length + ' files');
          conn.end();
        });
      });
    });
  }).connect(config);
}

compareDirs();
