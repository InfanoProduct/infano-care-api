import { Client } from 'ssh2';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const config = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
};

async function checkNginx() {
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec('grep -r "uploads/blog" /etc/nginx 2>/dev/null', (err, stream) => {
      if (err) throw err;
      stream.on('data', (data: any) => {
        console.log('STDOUT: ' + data);
      }).on('close', (code: any) => {
        console.log('Stream :: close :: code: ' + code);
        // If grep failed, try to list the files in sites-enabled
        conn.exec('ls -F /etc/nginx/sites-enabled', (err2, stream2) => {
           if (err2) throw err2;
           stream2.on('data', (data2: any) => {
              console.log('SITES-ENABLED: ' + data2);
           }).on('close', () => {
              conn.end();
           });
        });
      });
    });
  }).connect(config);
}

checkNginx();
