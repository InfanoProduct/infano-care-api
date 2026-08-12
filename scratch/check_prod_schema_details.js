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
  console.log("\n========================================");
  console.log("PROD DATABASE SCHEMA DETAILS & MIGRATIONS");
  console.log("========================================");

  const res = await runSSHCommand(prodConfig, 'PROD', `
    echo "=== 1. PROD SosIncident COLUMNS ==="
    docker exec postgres-prod psql -U postgres -d postgres -c "\\d \\"SosIncident\\"" 2>&1

    echo ""
    echo "=== 2. PROD UserSosPreference TABLE EXISTS? ==="
    docker exec postgres-prod psql -U postgres -d postgres -c "\\d \\"UserSosPreference\\"" 2>&1

    echo ""
    echo "=== 3. PROD TrustedContact COLUMNS ==="
    docker exec postgres-prod psql -U postgres -d postgres -c "\\d \\"TrustedContact\\"" 2>&1

    echo ""
    echo "=== 4. PROD ALL MIGRATIONS IN _prisma_migrations ==="
    docker exec postgres-prod psql -U postgres -d postgres -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at ASC;" 2>&1

    echo ""
    echo "=== 5. PROD CONTAINER RECENT LOGS (filter errors) ==="
    docker logs --tail 200 infano-api-prod 2>&1 | grep -iE "error|exception|fail|prisma" | tail -30
  `);
  console.log(res);
}

main().catch(console.error);
