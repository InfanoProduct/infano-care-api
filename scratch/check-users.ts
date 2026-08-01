import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

import { prisma } from "../src/db/client.js";

async function main() {
  const users = await prisma.user.findMany({
    include: {
      profile: true,
      peerApplication: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log("=== ALL USERS ===");
  users.forEach((u) => {
    console.log({
      id: u.id,
      username: u.username,
      phone: u.phone,
      role: u.role,
      accountStatus: u.accountStatus,
      peerOnboarding: u.peerOnboarding,
      profileName: u.profile?.displayName,
      hasPeerApp: !!u.peerApplication,
      peerAppStatus: u.peerApplication?.status,
      peerCertStatus: u.peerApplication?.certificationStatus,
    });
  });

  const apps = await prisma.peerApplication.findMany();
  console.log("=== ALL PEER APPLICATIONS ===");
  console.log(apps);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
