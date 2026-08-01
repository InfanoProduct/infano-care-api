import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

import { prisma } from "../src/db/client.js";

async function main() {
  const updatedUser = await prisma.user.update({
    where: { id: "d63fd112-cdbe-4edb-99d9-d947ff4b0ad8" },
    data: { accountStatus: "ACTIVE" },
  });

  console.log("Updated Khushi user record:", updatedUser);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
