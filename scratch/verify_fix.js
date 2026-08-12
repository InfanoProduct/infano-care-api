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
  console.log("=== RESTARTING CONTAINERS AND VERIFYING HEALTH ===");

  console.log("\n[PROD] Restarting infano-api-prod...");
  const prodRes = await runSSHCommand(prodConfig, 'PROD', `
    docker restart infano-api-prod 2>&1
    sleep 3
    echo "=== PROD LOGS AFTER RESTART ==="
    docker logs --tail 20 infano-api-prod 2>&1
  `);
  console.log(prodRes);

  console.log("\n[DEV] Restarting infano-api-dev...");
  const devRes = await runSSHCommand(devConfig, 'DEV', `
    docker restart infano-api-dev 2>&1
    sleep 3
    echo "=== DEV LOGS AFTER RESTART ==="
    docker logs --tail 20 infano-api-dev 2>&1
  `);
  console.log(devRes);
}

main().catch(console.error);
