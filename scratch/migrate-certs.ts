import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const missing = await prisma.peerApplication.findMany({
    where: {
      certificationStatus: 'certified',
      certificateId: null
    }
  });

  console.log(`Found ${missing.length} certified peers with missing IDs.`);

  for (const app of missing) {
    const newId = `INF-PEER-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await prisma.peerApplication.update({
      where: { id: app.id },
      data: { 
        certificateId: newId,
        certifiedAt: app.updatedAt // Use last update as proxy for certification date
      }
    });
    console.log(`Assigned ID ${newId} to ${app.name}`);
  }

  console.log('Migration complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
