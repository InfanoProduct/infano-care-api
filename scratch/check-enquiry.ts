import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const enquiries = await prisma.enquiry.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log(JSON.stringify(enquiries, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
