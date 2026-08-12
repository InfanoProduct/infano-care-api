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
      console.log(`[${label}] Connected! Executing command...`);
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        stream.on('close', (code, signal) => {
          console.log(`[${label}] Command finished with code ${code}`);
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
  const checkCmd = `
    echo "=== UPTIME & DISK ==="
    uptime
    df -h /
    echo ""
    echo "=== DOCKER CONTAINERS ==="
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
    echo ""
    echo "=== LOCATING APP & ENV FILES ==="
    find /root /var/www /home -name "schema.prisma" 2>/dev/null
    find /root /var/www /home -name ".env" 2>/dev/null
  `;

  try {
    await runSSHCommand(devConfig, 'DEV VPS', checkCmd);
  } catch (e) {
    console.error('Dev VPS check failed:', e.message);
  }

  try {
    await runSSHCommand(prodConfig, 'PROD VPS', checkCmd);
  } catch (e) {
    console.error('Prod VPS check failed:', e.message);
  }
}

main();
