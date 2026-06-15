const { PrismaClient } = require('./dist/db/client.js');
const prisma = new PrismaClient();
prisma.parentLink.findMany({
  include: {
    parent: { include: { profile: true } },
    teen: { include: { profile: true } },
    sender: { include: { profile: true } }
  }
}).then(console.log).catch(console.error).finally(() => prisma.$disconnect());
