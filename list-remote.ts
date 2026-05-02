import { Client } from 'ssh2';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const config = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
};

async function listDir() {
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
      if (err) throw err;
      
      sftp.readdir('.', (err, list) => {
        if (err) throw err;
        console.log('Home directory listing:');
        list.forEach(item => console.log(item.filename));
        
        // Try to look for docker
        sftp.readdir('/docker', (err, list2) => {
           if (!err) {
             console.log('/docker directory exists!');
           } else {
             console.log('/docker does not exist');
           }
           conn.end();
        });
      });
    });
  }).connect(config);
}

listDir();
