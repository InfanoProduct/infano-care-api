import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getSession() {
  const session = await prisma.peerLineSession.findUnique({
    where: { id: 'cb9913ab-a148-44be-a256-a879110cf0fe' }
  });
  console.log(JSON.stringify(session, null, 2));
}

getSession().finally(() => prisma.$disconnect());
