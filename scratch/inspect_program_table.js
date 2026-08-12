import { Client as SSHClient } from 'ssh2';

const prodConfig = {
  host: '213.199.52.192',
  port: 22,
  username: 'root',
  password: '8m~91CdjckEYsonw'
};

const devConfig = {
  host: '109.199.120.104',
  port: 22,
  username: 'root',
  password: 'B!6cCcvbPLhyH97'
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
  console.log("=== PROD Program table columns ===");
  const prodOut = await runSSHCommand(prodConfig, 'PROD', `
    docker exec postgres-prod psql -U postgres -d postgres -c "\\d \\"Program\\"" 2>&1
  `);
  console.log(prodOut);

  console.log("=== DEV Program table columns ===");
  const devOut = await runSSHCommand(devConfig, 'DEV', `
    docker exec postgres psql -U postgres -d infano_dev -c "\\d \\"Program\\"" 2>&1
  `);
  console.log(devOut);
}

main().catch(console.error);
