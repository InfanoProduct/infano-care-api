import { Client } from 'ssh2';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const config = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
};

async function checkPerms() {
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
      if (err) throw err;
      
      const path = 'infano-dev/uploads/blog';
      sftp.readdir(path, (err, list) => {
        if (err) throw err;
        console.log(`Permissions for files in ${path}:`);
        list.forEach(item => {
           console.log(`${item.filename}: ${item.attrs.mode} (uid: ${item.attrs.uid}, gid: ${item.attrs.gid})`);
        });
        conn.end();
      });
    });
  }).connect(config);
}

checkPerms();
