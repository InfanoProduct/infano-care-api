import pg from 'pg';
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
  console.log("=== CHECKING DATABASES AND TABLES VIA DOCKER EXEC ON BOTH SERVERS ===");

  const queryScript = `
    docker exec postgres-prod psql -U postgres -d postgres -c "SELECT datname FROM pg_database;" 2>/dev/null || docker exec postgres psql -U postgres -d postgres -c "SELECT datname FROM pg_database;" 2>/dev/null
  `;

  console.log("\n--- Databases on PROD VPS (213.199.52.192) ---");
  const prodDbs = await runSSHCommand(prodConfig, 'PROD', `
    echo "=== DATABASES ==="
    docker exec postgres-prod psql -U postgres -d postgres -c "\\l" 2>&1
    
    echo "=== TABLES IN postgres DB ==="
    docker exec postgres-prod psql -U postgres -d postgres -c "\\dt" 2>&1

    echo "=== COLUMNS IN SosIncident (postgres DB) ==="
    docker exec postgres-prod psql -U postgres -d postgres -c "\\d \\"SosIncident\\"" 2>&1

    echo "=== _prisma_migrations IN postgres DB ==="
    docker exec postgres-prod psql -U postgres -d postgres -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;" 2>&1
  `);
  console.log(prodDbs);

  console.log("\n--- Databases on DEV VPS (109.199.120.104) ---");
  const devDbs = await runSSHCommand(devConfig, 'DEV', `
    echo "=== DATABASES ==="
    docker exec postgres psql -U postgres -d postgres -c "\\l" 2>&1

    echo "=== TABLES IN infano_dev DB ==="
    docker exec postgres psql -U postgres -d infano_dev -c "\\dt" 2>&1

    echo "=== TABLES IN postgres DB ==="
    docker exec postgres psql -U postgres -d postgres -c "\\dt" 2>&1

    echo "=== COLUMNS IN SosIncident (infano_dev DB) ==="
    docker exec postgres psql -U postgres -d infano_dev -c "\\d \\"SosIncident\\"" 2>&1
  `);
  console.log(devDbs);
}

main().catch(console.error);
