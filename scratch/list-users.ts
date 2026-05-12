import { prisma } from "../src/db/client.js";

async function listAllUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, phone: true, role: true }
  });
  
  users.forEach(u => {
    console.log(`ID: ${u.id}, Phone: ${u.phone}, Role: ${u.role}`);
  });
}

listAllUsers().catch(console.error);
