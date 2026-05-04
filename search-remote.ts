import { Client } from 'ssh2';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const config = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
};

async function searchBlogs() {
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec('find / -name blogs -type d 2>/dev/null', (err, stream) => {
      if (err) throw err;
      stream.on('data', (data: any) => {
        console.log('STDOUT: ' + data);
      }).on('close', (code: any) => {
        console.log('Stream :: close :: code: ' + code);
        conn.end();
      });
    });
  }).connect(config);
}

searchBlogs();
