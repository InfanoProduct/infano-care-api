import { prisma } from "../src/db/client.js";

async function findDuplicates() {
  const users = await prisma.user.findMany();
  
  const phoneMap = new Map<string, any[]>();
  
  users.forEach(u => {
    let normalized = u.phone;
    if (u.phone && /^\d{10}$/.test(u.phone)) {
      normalized = `+91${u.phone}`;
    }
    
    if (!phoneMap.has(normalized)) {
      phoneMap.set(normalized, []);
    }
    phoneMap.get(normalized)!.push(u);
  });
  
  console.log("Duplicate Analysis:");
  for (const [phone, userList] of phoneMap.entries()) {
    if (userList.length > 1) {
      console.log(`\nPhone: ${phone}`);
      userList.forEach(u => {
        console.log(`- ID: ${u.id}, Actual Phone in DB: ${u.phone}, Role: ${u.role}, CreatedAt: ${u.createdAt}`);
      });
    }
  }
}

findDuplicates().catch(console.error);
