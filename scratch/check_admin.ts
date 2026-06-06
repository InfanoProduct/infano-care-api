import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check for admin users
  const adminUsers = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'EXPERT', 'OPS_MANAGER', 'SCHOOL_COORDINATOR'] }
    },
    select: {
      id: true,
      username: true,
      role: true,
      password: true,
      accountStatus: true,
    }
  });

  console.log('=== Admin-type users found ===');
  for (const u of adminUsers) {
    console.log(`  id: ${u.id}`);
    console.log(`  username: "${u.username}"`);
    console.log(`  role: ${u.role}`);
    console.log(`  accountStatus: ${u.accountStatus}`);
    console.log(`  hasPassword: ${!!u.password}`);
    
    if (u.password) {
      // Test against the password shown in the screenshot
      const test1 = await bcrypt.compare('infanocare1@3', u.password);
      console.log(`  password "infanocare1@3" matches: ${test1}`);
    }
    console.log('---');
  }

  // Also look specifically for the username from the screenshot
  const specificUser = await prisma.user.findUnique({
    where: { username: 'admin@infano.care' },
    select: { id: true, username: true, role: true, password: true, accountStatus: true }
  });
  console.log('\n=== Lookup by username "admin@infano.care" ===');
  console.log(specificUser ? JSON.stringify(specificUser, null, 2) : 'NOT FOUND');

  // Also try case variations
  const byEmail = await prisma.user.findFirst({
    where: { 
      username: { contains: 'infano', mode: 'insensitive' }
    },
    select: { id: true, username: true, role: true, password: true, accountStatus: true }
  });
  console.log('\n=== Fuzzy lookup (contains "infano") ===');
  console.log(byEmail ? JSON.stringify(byEmail, null, 2) : 'NOT FOUND');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
