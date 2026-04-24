import 'dotenv/config';
import { TrackerService } from '../src/modules/tracker/tracker.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testGetProfile(phone: string) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    console.log(`User with phone number ${phone} not found.`);
    return;
  }

  const profile = await TrackerService.getProfile(user.id);
  console.log(JSON.stringify(profile, null, 2));
}

const phone = '+919742802062';
testGetProfile(phone)
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
