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
  console.log("=== APPLYING SAFE DATABASE FIX TO PROD AND DEV POSTGRESQL DATABASES ===");

  const sql = `
    ALTER TABLE "Program" ALTER COLUMN "classRange" DROP NOT NULL;
    ALTER TABLE "Program" ALTER COLUMN "minClass" DROP NOT NULL;
    ALTER TABLE "Program" ALTER COLUMN "maxClass" DROP NOT NULL;
  `;

  console.log("\n[PROD] Executing ALTER TABLE on postgres-prod...");
  const prodRes = await runSSHCommand(prodConfig, 'PROD', `
    docker exec postgres-prod psql -U postgres -d postgres -c '${sql}' 2>&1
    echo "=== VERIFY PROD Program COLUMNS ==="
    docker exec postgres-prod psql -U postgres -d postgres -c "\\d \\"Program\\"" 2>&1
  `);
  console.log(prodRes);

  console.log("\n[DEV] Executing ALTER TABLE on postgres (infano_dev)...");
  const devRes = await runSSHCommand(devConfig, 'DEV', `
    docker exec postgres psql -U postgres -d infano_dev -c '${sql}' 2>&1
    echo "=== VERIFY DEV Program COLUMNS ==="
    docker exec postgres psql -U postgres -d infano_dev -c "\\d \\"Program\\"" 2>&1
  `);
  console.log(devRes);
}

main().catch(console.error);
