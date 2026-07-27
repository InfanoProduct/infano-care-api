const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expert = await prisma.user.findFirst({ where: { role: 'EXPERT' } });
  console.log('Expert:', expert);

  if (expert) {
    const http = require('http');
    const data = JSON.stringify({
      username: expert.email || expert.username,
      password: 'Expert@123'
    });

    const req = http.request('http://localhost:4000/api/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => console.log('Login Response:', body));
    });

    req.on('error', console.error);
    req.write(data);
    req.end();
  }
}

main().finally(() => prisma.$disconnect());
