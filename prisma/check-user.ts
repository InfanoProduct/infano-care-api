import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const user = await prisma.user.findUnique({ where: { phone: '+911234567890' } })
  console.log(JSON.stringify(user, null, 2))
}
main().finally(() => prisma.$disconnect())
