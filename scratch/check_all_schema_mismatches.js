import { Client as SSHClient } from 'ssh2';

const prodConfig = {
  host: '213.199.52.192',
  port: 22,
  username: 'root',
  password: '8m~91CdjckEYsonw'
};

function runSSHCommand(config, label, command) {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();
    let output = '';
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        stream.on('close', (code) => {
          conn.end();
          resolve(output);
        }).on('data', (data) => {
          output += data.toString();
        }).stderr.on('data', (data) => {
          output += data.toString();
        });
      });
    }).on('error', reject).connect(config);
  });
}

async function main() {
  console.log("=== CHECKING ALL NOT-NULL COLUMNS IN PROD POSTGRES DB ===");
  const sql = `
    SELECT table_name, column_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND is_nullable = 'NO'
    ORDER BY table_name, column_name;
  `;
  
  const res = await runSSHCommand(prodConfig, 'PROD', `
    docker exec postgres-prod psql -U postgres -d postgres -c "${sql.replace(/\n/g, ' ')}"
  `);
  console.log(res);
}

main().catch(console.error);
