import { Client } from 'ssh2';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const config = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
};

async function listInfano() {
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
      if (err) throw err;
      
      sftp.readdir('infano-dev', (err, list) => {
        if (err) {
          console.error('Error reading infano-dev:', err.message);
          conn.end();
          return;
        }
        console.log('infano-dev directory listing:');
        list.forEach(item => console.log(item.filename));
        conn.end();
      });
    });
  }).connect(config);
}

listInfano();
