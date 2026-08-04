import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

import { prisma } from "../src/db/client.js";

async function main() {
  const updatedUser = await prisma.user.update({
    where: { phone: "+911234567894" },
    data: { peerOnboarding: true },
  });

  console.log("Updated test-peer (+911234567894):", updatedUser);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
