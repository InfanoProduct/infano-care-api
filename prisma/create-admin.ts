import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const username = 'infano@admin.com'
  const password = 'password' // Change this to a secure password in production
  const hashedPassword = await bcrypt.hash(password, 10)

  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    },
    create: {
      username,
      password: hashedPassword,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      phone: '+910000000000', // Placeholder
    },
  })

  console.log('Admin user created/updated:', admin.username)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
