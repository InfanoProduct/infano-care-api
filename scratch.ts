import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const links = await prisma.parentLink.findMany({
    where: {
      status: "LINKED"
    },
    include: {
      teen: {
        include: {
          profile: true
        }
      },
      parent: {
        include: {
          profile: true
        }
      }
    }
  });

  console.log(JSON.stringify(links, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
