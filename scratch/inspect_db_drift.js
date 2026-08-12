import { Client } from 'ssh2';

const devConfig = {
  host: '109.199.120.104',
  port: 22,
  username: 'root',
  password: 'B!6cCcvbPLhyH97'
};

const prodConfig = {
  host: '213.199.52.192',
  port: 22,
  username: 'root',
  password: '8m~91CdjckEYsonw'
};

function runSSHCommand(config, label, command) {
  return new Promise((resolve, reject) => {
    console.log(`\n========================================`);
    console.log(`[${label}] Connecting to ${config.host}...`);
    console.log(`========================================`);
    
    const conn = new Client();
    let output = '';
    
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        stream.on('close', (code, signal) => {
          console.log(`[${label}] Finished with exit code ${code}`);
          conn.end();
          resolve(output);
        }).on('data', (data) => {
          output += data.toString();
          process.stdout.write(`[${label}] ${data.toString()}`);
        }).stderr.on('data', (data) => {
          output += data.toString();
          process.stderr.write(`[${label} ERR] ${data.toString()}`);
        });
      });
    }).on('error', (err) => {
      console.error(`[${label} ERROR] ${err.message}`);
      reject(err);
    }).connect(config);
  });
}

async function main() {
  const prodCmd = `
    echo "=== PROD CONTAINER LOGS (Last 50 lines) ==="
    docker logs --tail 50 infano-api-prod 2>&1

    echo ""
    echo "=== PROD PRISMA MIGRATE STATUS ==="
    docker exec infano-api-prod sh -c "npx prisma migrate status" 2>&1

    echo ""
    echo "=== PROD .ENV DATABASE_URL ==="
    docker exec infano-api-prod sh -c "cat /app/.env | grep -i DATABASE_URL" 2>&1 || cat /root/infano*/.env | grep -i DATABASE_URL 2>&1
  `;

  const devCmd = `
    echo "=== DEV PRISMA MIGRATE STATUS ==="
    docker exec infano-api-dev sh -c "npx prisma migrate status" 2>&1
  `;

  try {
    await runSSHCommand(prodConfig, 'PROD VPS', prodCmd);
  } catch (e) {
    console.error('Prod check failed:', e.message);
  }

  try {
    await runSSHCommand(devConfig, 'DEV VPS', devCmd);
  } catch (e) {
    console.error('Dev check failed:', e.message);
  }
}

main();
