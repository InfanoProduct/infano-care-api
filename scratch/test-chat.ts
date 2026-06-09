import { prisma } from "../src/db/client.js";
import { ChatService } from "../src/modules/chat/chat.service.js";

async function main() {
  console.log("--- DB Parent Links (LINKED) ---");
  const links = await prisma.parentLink.findMany({
    where: { status: "LINKED" },
    include: {
      parent: { select: { id: true, phone: true, role: true } },
      teen: { select: { id: true, phone: true, role: true } }
    }
  });
  links.forEach(l => {
    console.log(`Link: parentId=${l.parentId} (${l.parent?.phone}), teenId=${l.teenId} (${l.teen?.phone})`);
  });

  console.log("\n--- Program Enrollments ---");
  const enrollments = await prisma.programEnrollment.findMany({
    include: {
      user: { select: { id: true, phone: true, role: true } },
      program: { select: { id: true, title: true } }
    }
  });
  enrollments.forEach(e => {
    console.log(`Enrollment: userId=${e.userId} (${e.user?.phone}, role=${e.user?.role}), program=${e.program?.title}, status=${e.status}`);
  });

  console.log("\n--- Scheduled Expert Sessions ---");
  const sessions = await prisma.expertSessionSchedule.findMany({
    include: {
      user: { select: { phone: true } },
      program: { select: { title: true } }
    }
  });
  sessions.forEach(s => {
    console.log(`Session: userId=${s.userId} (${s.user?.phone}), program=${s.program?.title || 'None'}, sessionNumber=${s.sessionNumber}, status=${s.status}`);
  });

  // Pick a parent to test chat
  const testParent = links[0]?.parent || await prisma.user.findFirst({ where: { role: "PARENT" } });
  if (!testParent) {
    console.log("No parent found in DB to test!");
    return;
  }

  console.log(`\nTesting Gigi Chat for Parent: ${testParent.phone} (ID: ${testParent.id})`);
  const chatService = new ChatService();

  // Test Query 1: Ask about daughter status
  console.log("\n--- Query 1: 'How is my daughter doing?' ---");
  const res1 = await chatService.processMessage(testParent.id, "How is my daughter doing?");
  console.log("Gigi Response:\n", res1.message.content);

  // Test Query 2: Ask about daughter's program progress
  console.log("\n--- Query 2: 'what is my daughter's program progress?' ---");
  const res2 = await chatService.processMessage(testParent.id, "what is my daughter's program progress?");
  console.log("Gigi Response:\n", res2.message.content);

  // Test Query 3: Ask about parent's own program progress
  console.log("\n--- Query 3: 'what is my program progress?' ---");
  const res3 = await chatService.processMessage(testParent.id, "what is my program progress?");
  console.log("Gigi Response:\n", res3.message.content);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
