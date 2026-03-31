import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const inputArgs = process.argv.slice(2);
  if (inputArgs.length === 0) {
    console.error('Error: Please provide a phone number. Example: npm run create-test-user 1234567890');
    process.exit(1);
  }

  // Normalize phone to e.164 (+91 format)
  let phone = inputArgs[0];
  if (!phone.startsWith('+91')) {
    phone = phone.startsWith('91') ? '+' + phone : '+91' + phone.replace(/^\+/, '');
  }

  console.log(`Checking if user exists: ${phone}`)

  const existing = await prisma.user.findUnique({ where: { phone } })
  
  if (existing) {
    if (existing.isTestNumber) {
       console.log(`User ${phone} already exists and is already a Test Number.`);
    } else {
       console.log(`User ${phone} exists as a normal user. Converting to Test Number...`);
       await prisma.user.update({
         where: { id: existing.id },
         data: { isTestNumber: true }
       });
       console.log(`User ${phone} is now a Test Number.`);
    }
  } else {
    console.log(`Creating new Test User: ${phone}...`);
    await prisma.user.create({
      data: {
        phone,
        isTestNumber: true,
        accountStatus: 'PENDING_SETUP',
        onboardingStep: 0,
      }
    });
    console.log(`Test User ${phone} created successfully.`);
  }
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
