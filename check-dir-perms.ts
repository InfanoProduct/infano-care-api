import { Client } from 'ssh2';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const config = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
};

async function checkDirPerms() {
  const conn = new Client();
  
  conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
      if (err) throw err;
      
      sftp.stat('infano-dev/uploads/blog', (err, stats) => {
        if (err) throw err;
        console.log(`Directory stats: ${JSON.stringify(stats)}`);
        // Check if executable by others
        const mode = stats.mode;
        console.log(`Mode (octal): ${(mode & 0o777).toString(8)}`);
        
        sftp.stat('infano-dev/uploads', (err2, stats2) => {
           if (err2) throw err2;
           console.log(`Parent uploads stats: ${JSON.stringify(stats2)}`);
           console.log(`Parent Mode (octal): ${(stats2.mode & 0o777).toString(8)}`);
           conn.end();
        });
      });
    });
  }).connect(config);
}

checkDirPerms();
