import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

async function main() {
  const { AdminService } = await import("../src/modules/admin/admin.service.js");
  const { prisma } = await import("../src/db/client.js");

  const result = await AdminService.getUsers(1, 20, true);
  console.log("=== getUsers(1, 20, true) result ===");
  console.log("Total:", result.pagination.total);
  console.log("Users returned:");
  result.users.forEach((u) => {
    console.log({
      id: u.id,
      phone: u.phone,
      role: u.role,
      peerOnboarding: u.peerOnboarding,
      profileName: u.profile?.displayName,
      hasPeerApp: !!u.peerApplication,
    });
  });
  await prisma.$disconnect();
}

main().catch(console.error);
